import type { TQuota } from '@packages/domain'
import type { QuotasRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'
import { parseAmount, toDecimal, roundCurrency } from '@packages/utils/money'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TUnitsRepo = {
  getByCondominiumId: (condominiumId: string) => Promise<
    Array<{
      id: string
      unitNumber: string
      buildingId: string
      aliquotPercentage: string | null
      isActive: boolean
    }>
  >
}

export interface IDelinquencyReportInput {
  condominiumId: string
  asOfDate: string // yyyy-MM-dd
  buildingId?: string
}

export interface IDelinquentUnit {
  unitId: string
  unitNumber: string
  buildingId: string
  totalDebt: string
  overdueQuotaCount: number
  oldestDueDate: string
  maxDaysOverdue: number
  aging: {
    current: string
    days30: string
    days60: string
    days90Plus: string
  }
}

export interface IDelinquencyReportOutput {
  asOfDate: string
  summary: {
    totalDelinquent: string
    delinquentUnitCount: number
    totalUnits: number
    collectionRate: string // percentage
  }
  delinquentUnits: IDelinquentUnit[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class GetDelinquencyReportService {
  constructor(
    private readonly quotasRepo: QuotasRepository,
    private readonly unitsRepo: TUnitsRepo
  ) {}

  async execute(input: IDelinquencyReportInput): Promise<TServiceResult<IDelinquencyReportOutput>> {
    const { condominiumId, asOfDate, buildingId } = input

    // 1. Fetch all units and overdue quotas
    const [allUnits, overdueQuotas] = await Promise.all([
      this.unitsRepo.getByCondominiumId(condominiumId),
      this.quotasRepo.getOverdue(asOfDate, condominiumId),
    ])

    // Build unit lookup
    const unitMap = new Map(allUnits.map(u => [u.id, u]))

    // 2. Filter by building if specified
    const filteredQuotas = buildingId
      ? overdueQuotas.filter(q => {
          const unit = unitMap.get(q.unitId)
          return unit?.buildingId === buildingId
        })
      : overdueQuotas

    const filteredUnits = buildingId ? allUnits.filter(u => u.buildingId === buildingId) : allUnits

    // 3. Group quotas by unit
    const byUnit = new Map<string, TQuota[]>()
    for (const q of filteredQuotas) {
      const existing = byUnit.get(q.unitId) ?? []
      existing.push(q)
      byUnit.set(q.unitId, existing)
    }

    // 4. Build delinquent units
    const asOfMs = new Date(asOfDate).getTime()
    const msPerDay = 24 * 60 * 60 * 1000

    const delinquentUnits: IDelinquentUnit[] = []
    let totalDelinquent = 0
    let totalCharged = 0
    let totalPaid = 0

    for (const [unitId, quotas] of byUnit) {
      const unit = unitMap.get(unitId)
      if (!unit) continue

      let debt = 0
      let oldest = quotas[0]!.dueDate
      let maxDays = 0
      let current = 0
      let d30 = 0
      let d60 = 0
      let d90 = 0

      for (const q of quotas) {
        const balance = parseAmount(q.balance)
        debt += balance

        if (q.dueDate < oldest) oldest = q.dueDate

        const daysOverdue = Math.floor((asOfMs - new Date(q.dueDate).getTime()) / msPerDay)
        if (daysOverdue > maxDays) maxDays = daysOverdue

        if (daysOverdue <= 30) current += balance
        else if (daysOverdue <= 60) d30 += balance
        else if (daysOverdue <= 90) d60 += balance
        else d90 += balance

        totalCharged += parseAmount(q.baseAmount) + parseAmount(q.adjustmentsTotal)
        totalPaid += parseAmount(q.paidAmount)
      }

      totalDelinquent += debt

      delinquentUnits.push({
        unitId,
        unitNumber: unit.unitNumber,
        buildingId: unit.buildingId,
        totalDebt: toDecimal(roundCurrency(debt)),
        overdueQuotaCount: quotas.length,
        oldestDueDate: oldest,
        maxDaysOverdue: maxDays,
        aging: {
          current: toDecimal(roundCurrency(current)),
          days30: toDecimal(roundCurrency(d30)),
          days60: toDecimal(roundCurrency(d60)),
          days90Plus: toDecimal(roundCurrency(d90)),
        },
      })
    }

    // Sort by total debt descending
    delinquentUnits.sort((a, b) => parseAmount(b.totalDebt) - parseAmount(a.totalDebt))

    // 5. Calculate collection rate
    const collectionRate = totalCharged > 0 ? roundCurrency((totalPaid / totalCharged) * 100) : 100

    return success({
      asOfDate,
      summary: {
        totalDelinquent: toDecimal(roundCurrency(totalDelinquent)),
        delinquentUnitCount: delinquentUnits.length,
        totalUnits: filteredUnits.length,
        collectionRate: toDecimal(collectionRate),
      },
      delinquentUnits,
    })
  }
}
