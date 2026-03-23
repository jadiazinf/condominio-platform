import type { TQuota } from '@packages/domain'
import type {
  QuotasRepository,
  PaymentsRepository,
  PaymentApplicationsRepository,
} from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'
import { parseAmount, toDecimal, roundCurrency } from '@packages/utils/money'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TUnitsRepo = {
  getById: (id: string) => Promise<{
    id: string
    unitNumber: string
    buildingId: string
    aliquotPercentage: string | null
    isActive: boolean
  } | null>
}

export interface IAccountStatementInput {
  unitId: string
  from: string // yyyy-MM-dd
  to: string // yyyy-MM-dd
  asOfDate?: string // yyyy-MM-dd, for aging calculation (defaults to `to`)
}

export interface ILineItem {
  date: string
  type: 'charge' | 'payment' | 'interest'
  description: string
  amount: string
  reference?: string
}

export interface IAging {
  current: string // 0-30 days
  days30: string // 31-60 days
  days60: string // 61-90 days
  days90Plus: string // 90+ days
  total: string
}

export interface IAccountStatementOutput {
  unit: {
    id: string
    unitNumber: string
    buildingId: string
    aliquotPercentage: string | null
  }
  period: { from: string; to: string }
  previousBalance: string
  totalCharges: string
  totalPayments: string
  totalInterest: string
  currentBalance: string
  lineItems: ILineItem[]
  aging: IAging
}

// Statuses that represent "active" quotas (not cancelled or exonerated)
const ACTIVE_STATUSES = new Set(['pending', 'partial', 'paid', 'overdue'])

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class GetUnitAccountStatementService {
  constructor(
    private readonly quotasRepo: QuotasRepository,
    private readonly paymentsRepo: PaymentsRepository,
    private readonly applicationsRepo: PaymentApplicationsRepository,
    private readonly unitsRepo: TUnitsRepo
  ) {}

  async execute(input: IAccountStatementInput): Promise<TServiceResult<IAccountStatementOutput>> {
    const { unitId, from, to } = input
    const asOfDate = input.asOfDate ?? to

    // 1. Validate unit
    const unit = await this.unitsRepo.getById(unitId)
    if (!unit) {
      return failure('Unidad no encontrada', 'NOT_FOUND')
    }

    // 2. Fetch all quotas and payments for this unit
    const [allQuotas, allPayments] = await Promise.all([
      this.quotasRepo.getByUnitId(unitId),
      this.paymentsRepo.getByUnitId(unitId),
    ])

    // 3. Filter to active quotas only
    const activeQuotas = allQuotas.filter(q => ACTIVE_STATUSES.has(q.status))

    // 4. Split quotas: before period vs in period
    const quotasBefore = activeQuotas.filter(q => q.issueDate < from)
    const quotasInPeriod = activeQuotas.filter(q => q.issueDate >= from && q.issueDate <= to)

    // 5. Calculate previous balance (sum of outstanding balances before period)
    const previousBalance = quotasBefore.reduce((sum, q) => sum + parseAmount(q.balance), 0)

    // 6. Calculate charges in period (effective amounts: base + adjustments)
    const totalCharges = quotasInPeriod.reduce(
      (sum, q) => sum + parseAmount(q.baseAmount) + parseAmount(q.adjustmentsTotal),
      0
    )

    // 7. Calculate interest in period
    const totalInterest = quotasInPeriod.reduce((sum, q) => sum + parseAmount(q.interestAmount), 0)

    // 8. Calculate payments in period (only completed, within date range)
    const paymentsInPeriod = allPayments.filter(
      p => p.status === 'completed' && p.paymentDate >= from && p.paymentDate <= to
    )
    const totalPayments = paymentsInPeriod.reduce((sum, p) => sum + parseAmount(p.amount), 0)

    // 9. Calculate current balance
    const currentBalance = roundCurrency(
      previousBalance + totalCharges + totalInterest - totalPayments
    )

    // 10. Build line items
    const lineItems: ILineItem[] = []

    for (const q of quotasInPeriod) {
      const effectiveAmount = parseAmount(q.baseAmount) + parseAmount(q.adjustmentsTotal)
      lineItems.push({
        date: q.issueDate,
        type: 'charge',
        description:
          q.periodDescription ?? `${q.periodYear}-${String(q.periodMonth).padStart(2, '0')}`,
        amount: toDecimal(effectiveAmount),
      })

      const interest = parseAmount(q.interestAmount)
      if (interest > 0) {
        lineItems.push({
          date: q.dueDate,
          type: 'interest',
          description: `Interés moratorio — ${q.periodDescription ?? ''}`,
          amount: toDecimal(interest),
        })
      }
    }

    for (const p of paymentsInPeriod) {
      lineItems.push({
        date: p.paymentDate,
        type: 'payment',
        description: `Pago ${p.paymentMethod}`,
        amount: toDecimal(parseAmount(p.amount)),
        reference: p.receiptNumber ?? undefined,
      })
    }

    // Sort chronologically
    lineItems.sort((a, b) => a.date.localeCompare(b.date))

    // 11. Calculate aging
    const aging = this.calculateAging(activeQuotas, asOfDate)

    return success({
      unit: {
        id: unit.id,
        unitNumber: unit.unitNumber,
        buildingId: unit.buildingId,
        aliquotPercentage: unit.aliquotPercentage,
      },
      period: { from, to },
      previousBalance: toDecimal(previousBalance),
      totalCharges: toDecimal(totalCharges),
      totalPayments: toDecimal(totalPayments),
      totalInterest: toDecimal(totalInterest),
      currentBalance: toDecimal(currentBalance),
      lineItems,
      aging,
    })
  }

  private calculateAging(quotas: TQuota[], asOfDateStr: string): IAging {
    const asOf = new Date(asOfDateStr)
    let current = 0
    let days30 = 0
    let days60 = 0
    let days90Plus = 0

    for (const q of quotas) {
      const balance = parseAmount(q.balance)
      if (balance <= 0) continue

      const dueDate = new Date(q.dueDate)
      const daysOverdue = Math.floor((asOf.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000))

      if (daysOverdue <= 0) continue // not yet due

      if (daysOverdue <= 30) {
        current += balance
      } else if (daysOverdue <= 60) {
        days30 += balance
      } else if (daysOverdue <= 90) {
        days60 += balance
      } else {
        days90Plus += balance
      }
    }

    const total = roundCurrency(current + days30 + days60 + days90Plus)

    return {
      current: toDecimal(current),
      days30: toDecimal(days30),
      days60: toDecimal(days60),
      days90Plus: toDecimal(days90Plus),
      total: toDecimal(total),
    }
  }
}
