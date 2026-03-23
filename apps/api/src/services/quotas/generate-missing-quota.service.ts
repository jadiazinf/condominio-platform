import type { TQuota } from '@packages/domain'
import type {
  QuotasRepository,
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

export interface IGenerateMissingQuotaInput {
  unitId: string
  paymentConceptId: string
  periodYear: number
  periodMonth: number
  generatedBy: string
}

export class GenerateMissingQuotaService {
  constructor(
    private readonly db: TDrizzleClient,
    private readonly conceptsRepo: PaymentConceptsRepository,
    private readonly assignmentsRepo: PaymentConceptAssignmentsRepository,
    private readonly unitsRepo: TUnitsRepo,
    private readonly quotasRepo: QuotasRepository
  ) {}

  async execute(input: IGenerateMissingQuotaInput): Promise<TServiceResult<{ quota: TQuota }>> {
    const { unitId, paymentConceptId, periodYear, periodMonth, generatedBy } = input

    // 1. Validate concept
    const concept = await this.conceptsRepo.getById(paymentConceptId)
    if (!concept) return failure('Concepto de pago no encontrado', 'NOT_FOUND')
    if (!concept.isActive) return failure('El concepto de pago está inactivo', 'BAD_REQUEST')

    // 2. Validate unit
    const unit = await this.unitsRepo.getById(unitId)
    if (!unit) return failure('Unidad no encontrada', 'NOT_FOUND')
    if (!unit.isActive) return failure('La unidad está inactiva', 'BAD_REQUEST')

    // 3. Check existing quota
    const existing = await this.quotasRepo.getByUnitConceptAndPeriod(
      unitId,
      paymentConceptId,
      periodYear,
      periodMonth
    )

    if (existing && existing.status !== 'cancelled' && existing.status !== 'exonerated') {
      return failure(
        `Ya existe una cuota activa para este periodo (estado: ${existing.status})`,
        'CONFLICT'
      )
    }

    // 4. Resolve amount from assignments
    const assignments = await this.assignmentsRepo.listByConceptId(paymentConceptId)
    if (assignments.length === 0) {
      return failure('No hay asignaciones activas para este concepto', 'BAD_REQUEST')
    }

    const mappedAssignments = assignments.map(a => ({
      scopeType: a.scopeType,
      buildingId: a.buildingId,
      unitId: a.unitId,
      amount: String(a.amount),
      distributionMethod: a.distributionMethod,
    }))
    const amount = await this.resolveUnitAmount(mappedAssignments, unit, concept.condominiumId!)
    if (amount === null) {
      return failure(
        'La unidad no está incluida en ninguna asignación de este concepto',
        'BAD_REQUEST'
      )
    }
    if (amount <= 0) {
      return failure(
        'El monto calculado es 0. Verifique que la unidad tenga una alícuota asignada si el concepto usa distribución por alícuota.',
        'BAD_REQUEST'
      )
    }

    // 5. Calculate dates
    const issueDay = concept.issueDay ?? 1
    const dueDay = concept.dueDay ?? 28
    const issueDate = this.formatDate(periodYear, periodMonth, issueDay)

    let dueYear = periodYear
    let dueMonth = periodMonth
    if (dueDay < issueDay) {
      dueMonth += 1
      if (dueMonth > 12) {
        dueMonth = 1
        dueYear += 1
      }
    }
    const dueDate = this.formatDate(dueYear, dueMonth, dueDay)

    const periodDescription = `${MONTH_NAMES[periodMonth - 1]} ${periodYear}`

    // 6. Create or reactivate in transaction
    return await this.db.transaction(async tx => {
      const txQuotasRepo = this.quotasRepo.withTx(tx) as QuotasRepository

      if (existing) {
        // Reactivate cancelled/exonerated quota with new data
        await txQuotasRepo.update(existing.id, {
          baseAmount: amount.toString(),
          balance: amount.toString(),
          adjustmentsTotal: '0',
          paidAmount: '0',
          interestAmount: '0',
          status: 'pending',
          issueDate,
          dueDate,
          periodDescription,
          notes: null,
        })
        const updated = await txQuotasRepo.getById(existing.id)
        return success({ quota: updated! })
      }

      // Create new quota
      const created = await txQuotasRepo.create({
        unitId,
        paymentConceptId,
        periodYear,
        periodMonth,
        periodDescription,
        baseAmount: amount.toString(),
        currencyId: concept.currencyId,
        issueDate,
        dueDate,
        status: 'pending',
        balance: amount.toString(),
        createdBy: generatedBy,
        interestAmount: '0',
        adjustmentsTotal: '0',
        paidAmount: '0',
        amountInBaseCurrency: null,
        exchangeRateUsed: null,
        metadata: null,
        notes: null,
      })

      return success({ quota: created })
    })
  }

  /**
   * Resolves the amount for a single unit from the assignment hierarchy.
   * Priority: unit-specific > building > condominium
   */
  private async resolveUnitAmount(
    assignments: Array<{
      scopeType: string
      buildingId: string | null
      unitId: string | null
      amount: string
      distributionMethod: string
    }>,
    unit: TUnitInfo,
    condominiumId: string
  ): Promise<number | null> {
    // Check unit-specific first (highest priority)
    const unitAssignment = assignments.find(a => a.scopeType === 'unit' && a.unitId === unit.id)
    if (unitAssignment) {
      return parseAmount(unitAssignment.amount)
    }

    // Check building-level
    const buildingAssignment = assignments.find(
      a => a.scopeType === 'building' && a.buildingId === unit.buildingId
    )
    if (buildingAssignment) {
      return this.calculateUnitShare(buildingAssignment, unit, async () => {
        const units = await this.unitsRepo.getByBuildingId(unit.buildingId)
        return units.filter(u => u.isActive)
      })
    }

    // Check condominium-level
    const condoAssignment = assignments.find(a => a.scopeType === 'condominium')
    if (condoAssignment) {
      return this.calculateUnitShare(condoAssignment, unit, async () => {
        const units = await this.unitsRepo.getByCondominiumId(condominiumId)
        return units.filter(u => u.isActive)
      })
    }

    return null
  }

  private async calculateUnitShare(
    assignment: { amount: string; distributionMethod: string },
    unit: TUnitInfo,
    getUnits: () => Promise<TUnitInfo[]>
  ): Promise<number> {
    const total = parseAmount(assignment.amount)
    const units = await getUnits()

    switch (assignment.distributionMethod) {
      case 'by_aliquot': {
        const unitAliquot = unit.aliquotPercentage != null ? parseAmount(unit.aliquotPercentage) : 0
        if (unitAliquot <= 0) return 0

        const unitsWithAliquot = units.filter(
          u => u.aliquotPercentage != null && parseAmount(u.aliquotPercentage) > 0
        )
        if (unitsWithAliquot.length === 0) return 0
        const totalAliquot = unitsWithAliquot.reduce(
          (sum, u) => sum + parseAmount(u.aliquotPercentage),
          0
        )
        const proportion = unitAliquot / totalAliquot
        return roundCurrency(total * proportion)
      }
      case 'equal_split':
        return roundCurrency(total / units.length)
      case 'fixed_per_unit':
        return total
      default:
        return 0
    }
  }

  private formatDate(year: number, month: number, day: number): string {
    const maxDay = new Date(year, month, 0).getDate()
    const clampedDay = Math.min(day, maxDay)
    return `${year}-${String(month).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`
  }
}
