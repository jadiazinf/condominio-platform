import type { TPaymentConceptAssignment } from '@packages/domain'
import type {
  PaymentConceptsRepository,
  PaymentConceptAssignmentsRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'

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

    // Check for existing quotas
    const exists = await this.quotasRepo.existsForConceptAndPeriod(
      input.paymentConceptId,
      input.periodYear,
      input.periodMonth
    )
    if (exists) {
      return failure('Charges already exist for this period', 'CONFLICT')
    }

    // Load assignments
    const assignments = await this.assignmentsRepo.listByConceptId(input.paymentConceptId)
    if (assignments.length === 0) {
      return failure('No active assignments for this concept', 'BAD_REQUEST')
    }

    // Resolve unit amounts
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

    // Create quotas in transaction
    const quotaRecords = unitAmounts.map(ua => ({
      unitId: ua.unitId,
      paymentConceptId: input.paymentConceptId,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      baseAmount: ua.amount.toString(),
      currencyId: concept.currencyId,
      issueDate,
      dueDate,
      status: 'pending',
      balance: ua.amount.toString(),
      createdBy: input.generatedBy,
    }))

    await this.quotasRepo.createMany(quotaRecords)

    const totalAmount = unitAmounts.reduce((sum, ua) => sum + ua.amount, 0)

    return success({
      quotasCreated: unitAmounts.length,
      totalAmount,
      issueDate,
      dueDate,
      unitDetails: unitAmounts,
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
      unitAmountMap.set(assignment.unitId, Number(assignment.amount))
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

    const total = Number(assignment.amount)

    switch (assignment.distributionMethod) {
      case 'by_aliquot': {
        const unitsWithAliquot = units.filter(
          u => u.aliquotPercentage != null && Number(u.aliquotPercentage) > 0
        )
        if (unitsWithAliquot.length === 0) return result

        const totalAliquot = unitsWithAliquot.reduce(
          (sum, u) => sum + Number(u.aliquotPercentage!),
          0
        )

        let distributed = 0
        for (let i = 0; i < unitsWithAliquot.length; i++) {
          const unit = unitsWithAliquot[i]!
          const proportion = Number(unit.aliquotPercentage!) / totalAliquot

          if (i === unitsWithAliquot.length - 1) {
            // Last unit gets remainder (penny adjustment)
            const amount = this.roundCurrency(total - distributed)
            result.set(unit.id, amount)
          } else {
            const amount = this.roundCurrency(total * proportion)
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
            // Last unit gets remainder
            const amount = this.roundCurrency(total - distributed)
            result.set(unit.id, amount)
          } else {
            const amount = this.roundCurrency(perUnit)
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

  private roundCurrency(amount: number): number {
    return Math.round(amount * 100) / 100
  }

  private formatDate(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
}
