import type { TPaymentConceptAssignment } from '@packages/domain'
import type {
  PaymentConceptsRepository,
  PaymentConceptAssignmentsRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'
import { parseAmount, roundCurrency } from '@packages/utils/money'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

type TUnitInfo = {
  id: string
  buildingId: string
  aliquotPercentage: string | null
  isActive: boolean
}

type TUnitsRepo = {
  getByCondominiumId: (condominiumId: string) => Promise<TUnitInfo[]>
  getByBuildingId: (buildingId: string) => Promise<TUnitInfo[]>
  getById: (id: string) => Promise<TUnitInfo | null>
}

type TQuotasRepo = {
  existsForConceptAndPeriod: (conceptId: string, year: number, month: number) => Promise<boolean>
  createMany: (quotas: Record<string, unknown>[]) => Promise<{ id: string }[]>
  withTx: (tx: TDrizzleClient) => TQuotasRepo
}

export interface IGenerateChargesInput {
  paymentConceptId: string
  periodYear: number
  periodMonth: number
  generatedBy: string
}

type TUnitDetail = {
  unitId: string
  amount: number
}

type TGenerateChargesResult = {
  quotasCreated: number
  totalAmount: number
  issueDate: string
  dueDate: string
  unitDetails: TUnitDetail[]
}

export class GenerateChargesService {
  constructor(
    private readonly db: TDrizzleClient,
    private readonly conceptsRepo: PaymentConceptsRepository,
    private readonly assignmentsRepo: PaymentConceptAssignmentsRepository,
    private readonly unitsRepo: TUnitsRepo,
    private readonly quotasRepo: TQuotasRepo
  ) {}

  async execute(input: IGenerateChargesInput): Promise<TServiceResult<TGenerateChargesResult>> {
    // Validate concept
    const concept = await this.conceptsRepo.getById(input.paymentConceptId)
    if (!concept) {
      return failure('Payment concept not found', 'NOT_FOUND')
    }
    if (!concept.isActive) {
      return failure('Cannot generate charges for an inactive concept', 'BAD_REQUEST')
    }

    // Quick pre-check for existing quotas (fast-path for user-facing errors).
    // The authoritative check is inside the transaction below.
    const existsPreCheck = await this.quotasRepo.existsForConceptAndPeriod(
      input.paymentConceptId,
      input.periodYear,
      input.periodMonth
    )
    if (existsPreCheck) {
      return failure('Charges already exist for this period', 'CONFLICT')
    }

    // Load assignments
    const assignments = await this.assignmentsRepo.listByConceptId(input.paymentConceptId)
    if (assignments.length === 0) {
      return failure('No active assignments for this concept', 'BAD_REQUEST')
    }

    // Resolve unit amounts (read-only, safe outside transaction)
    const unitAmounts = await this.resolveUnitAmounts(assignments, concept.condominiumId!)

    if (unitAmounts.length === 0) {
      return failure('No units to generate charges for', 'BAD_REQUEST')
    }

    // Calculate dates
    const issueDay = concept.issueDay ?? 1
    const dueDay = concept.dueDay ?? 28
    const issueDate = this.formatDate(input.periodYear, input.periodMonth, issueDay)

    // If dueDay < issueDay, the due date falls in the NEXT month
    let dueYear = input.periodYear
    let dueMonth = input.periodMonth
    if (dueDay < issueDay) {
      dueMonth += 1
      if (dueMonth > 12) {
        dueMonth = 1
        dueYear += 1
      }
    }
    const dueDate = this.formatDate(dueYear, dueMonth, dueDay)

    // Period description
    const periodDescription = `${MONTH_NAMES[input.periodMonth - 1]} ${input.periodYear}`

    // Duplicate check + insert inside transaction to prevent race conditions.
    // The unique index on (unit_id, payment_concept_id, period_year, period_month)
    // is the ultimate safety net, but checking first gives a cleaner error message.
    return await this.db.transaction(async tx => {
      const txQuotasRepo = this.quotasRepo.withTx(tx)

      const exists = await txQuotasRepo.existsForConceptAndPeriod(
        input.paymentConceptId,
        input.periodYear,
        input.periodMonth
      )
      if (exists) {
        return failure('Charges already exist for this period', 'CONFLICT')
      }

      const quotaRecords = unitAmounts.map(ua => ({
        unitId: ua.unitId,
        paymentConceptId: input.paymentConceptId,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
        periodDescription,
        baseAmount: ua.amount.toString(),
        currencyId: concept.currencyId,
        issueDate,
        dueDate,
        status: 'pending',
        balance: ua.amount.toString(),
        createdBy: input.generatedBy,
      }))

      await txQuotasRepo.createMany(quotaRecords)

      const totalAmount = unitAmounts.reduce((sum, ua) => sum + ua.amount, 0)

      return success({
        quotasCreated: unitAmounts.length,
        totalAmount,
        issueDate,
        dueDate,
        unitDetails: unitAmounts,
      })
    })
  }

  /**
   * Resolves all assignments into a flat list of (unitId, amount) pairs.
   * Unit-specific assignments override condominium/building-wide for that unit.
   */
  private async resolveUnitAmounts(
    assignments: TPaymentConceptAssignment[],
    condominiumId: string
  ): Promise<TUnitDetail[]> {
    const unitAmountMap = new Map<string, number>()

    // Process condominium-wide first, then building-wide, then unit-specific (overrides)
    const condoAssignments = assignments.filter(a => a.scopeType === 'condominium')
    const buildingAssignments = assignments.filter(a => a.scopeType === 'building')
    const unitAssignments = assignments.filter(a => a.scopeType === 'unit')

    // Process condominium-wide
    for (const assignment of condoAssignments) {
      const units = await this.unitsRepo.getByCondominiumId(condominiumId)
      const activeUnits = units.filter(u => u.isActive)
      const amounts = this.calculateDistribution(assignment, activeUnits)
      for (const [unitId, amount] of amounts) {
        unitAmountMap.set(unitId, amount)
      }
    }

    // Process building-wide (may override condominium-wide for those units)
    for (const assignment of buildingAssignments) {
      if (!assignment.buildingId) continue
      const units = await this.unitsRepo.getByBuildingId(assignment.buildingId)
      const activeUnits = units.filter(u => u.isActive)
      const amounts = this.calculateDistribution(assignment, activeUnits)
      for (const [unitId, amount] of amounts) {
        unitAmountMap.set(unitId, amount)
      }
    }

    // Process unit-specific (override everything)
    for (const assignment of unitAssignments) {
      if (!assignment.unitId) continue
      unitAmountMap.set(assignment.unitId, parseAmount(assignment.amount))
    }

    return Array.from(unitAmountMap.entries()).map(([unitId, amount]) => ({ unitId, amount }))
  }

  /**
   * Distributes amount among units based on the distribution method.
   */
  private calculateDistribution(
    assignment: TPaymentConceptAssignment,
    units: TUnitInfo[]
  ): Map<string, number> {
    const result = new Map<string, number>()

    if (units.length === 0) return result

    const total = parseAmount(assignment.amount)

    switch (assignment.distributionMethod) {
      case 'by_aliquot': {
        const unitsWithAliquot = units.filter(
          u => u.aliquotPercentage != null && parseAmount(u.aliquotPercentage) > 0
        )
        if (unitsWithAliquot.length === 0) return result

        const totalAliquot = unitsWithAliquot.reduce(
          (sum, u) => sum + parseAmount(u.aliquotPercentage),
          0
        )

        let distributed = 0
        for (let i = 0; i < unitsWithAliquot.length; i++) {
          const unit = unitsWithAliquot[i]!
          const proportion = parseAmount(unit.aliquotPercentage) / totalAliquot

          if (i === unitsWithAliquot.length - 1) {
            const amount = roundCurrency(total - distributed)
            result.set(unit.id, amount)
          } else {
            const amount = roundCurrency(total * proportion)
            result.set(unit.id, amount)
            distributed += amount
          }
        }
        break
      }

      case 'equal_split': {
        const perUnit = total / units.length
        let distributed = 0

        for (let i = 0; i < units.length; i++) {
          const unit = units[i]!
          if (i === units.length - 1) {
            const amount = roundCurrency(total - distributed)
            result.set(unit.id, amount)
          } else {
            const amount = roundCurrency(perUnit)
            result.set(unit.id, amount)
            distributed += amount
          }
        }
        break
      }

      case 'fixed_per_unit': {
        for (const unit of units) {
          result.set(unit.id, total)
        }
        break
      }
    }

    return result
  }

  private formatDate(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  /**
   * Generates charges for ALL periods between effectiveFrom and effectiveUntil
   * based on the concept's recurrence period (monthly, quarterly, yearly).
   */
  async executeBulk(input: {
    paymentConceptId: string
    generatedBy: string
  }): Promise<
    TServiceResult<{ periodsGenerated: number; totalQuotas: number; totalAmount: number }>
  > {
    const concept = await this.conceptsRepo.getById(input.paymentConceptId)
    if (!concept) return failure('Payment concept not found', 'NOT_FOUND')
    if (!concept.isActive)
      return failure('Cannot generate charges for an inactive concept', 'BAD_REQUEST')
    if (!concept.isRecurring || !concept.recurrencePeriod) {
      return failure('Bulk generation is only available for recurring concepts', 'BAD_REQUEST')
    }
    if (!concept.effectiveFrom) return failure('Effective from date is required', 'BAD_REQUEST')
    if (!concept.effectiveUntil)
      return failure('Effective until date is required for bulk generation', 'BAD_REQUEST')

    const periods = this.calculatePeriods(
      concept.effectiveFrom.toISOString(),
      concept.effectiveUntil.toISOString(),
      concept.recurrencePeriod as 'monthly' | 'quarterly' | 'yearly'
    )

    if (periods.length === 0) {
      return failure('No periods to generate between the effective dates', 'BAD_REQUEST')
    }

    let totalQuotas = 0
    let totalAmount = 0
    let periodsGenerated = 0

    for (const period of periods) {
      const result = await this.execute({
        paymentConceptId: input.paymentConceptId,
        periodYear: period.year,
        periodMonth: period.month,
        generatedBy: input.generatedBy,
      })

      if (result.success) {
        periodsGenerated++
        totalQuotas += result.data.quotasCreated
        totalAmount += result.data.totalAmount
      }
      // Skip periods that already have charges (CONFLICT) — continue with the rest
    }

    return success({ periodsGenerated, totalQuotas, totalAmount })
  }

  private calculatePeriods(
    fromDate: string,
    untilDate: string,
    recurrence: 'monthly' | 'quarterly' | 'yearly'
  ): Array<{ year: number; month: number }> {
    const from = new Date(fromDate)
    const until = new Date(untilDate)
    const periods: Array<{ year: number; month: number }> = []

    const monthStep = recurrence === 'monthly' ? 1 : recurrence === 'quarterly' ? 3 : 12

    let year = from.getFullYear()
    let month = from.getMonth() + 1 // 1-based

    while (true) {
      const periodDate = new Date(year, month - 1, 1)
      if (periodDate > until) break

      periods.push({ year, month })

      month += monthStep
      if (month > 12) {
        year += Math.floor((month - 1) / 12)
        month = ((month - 1) % 12) + 1
      }
    }

    return periods
  }
}
