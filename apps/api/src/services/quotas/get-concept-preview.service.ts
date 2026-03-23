import type { TPaymentConcept, TPaymentConceptAssignment } from '@packages/domain'
import type {
  PaymentConceptsRepository,
  PaymentConceptAssignmentsRepository,
} from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'
import { parseAmount, roundCurrency } from '@packages/utils/money'

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

type TCurrenciesRepo = {
  getById: (
    id: string
  ) => Promise<{ id: string; code: string; symbol: string | null; name: string } | null>
}

export interface IConceptPreviewCurrency {
  code: string
  symbol: string | null
  name: string
}

export interface IConceptPreviewResult {
  concept: Omit<TPaymentConcept, 'currency'> & { currency?: IConceptPreviewCurrency }
  assignment: {
    scopeType: string
    distributionMethod: string
    totalAmount: number
  } | null
  unitAmount: number | null
}

export class GetConceptPreviewService {
  constructor(
    private readonly conceptsRepo: PaymentConceptsRepository,
    private readonly assignmentsRepo: PaymentConceptAssignmentsRepository,
    private readonly unitsRepo: TUnitsRepo,
    private readonly currenciesRepo: TCurrenciesRepo
  ) {}

  async execute(unitId: string, conceptId: string): Promise<TServiceResult<IConceptPreviewResult>> {
    // 1. Load concept
    const concept = await this.conceptsRepo.getById(conceptId)
    if (!concept) return failure('Concepto no encontrado', 'NOT_FOUND')

    // 2. Load currency
    let currency: { code: string; symbol: string | null; name: string } | undefined
    if (concept.currencyId) {
      const curr = await this.currenciesRepo.getById(concept.currencyId)
      if (curr) currency = { code: curr.code, symbol: curr.symbol, name: curr.name }
    }

    // 3. Load unit
    const unit = await this.unitsRepo.getById(unitId)
    if (!unit) return failure('Unidad no encontrada', 'NOT_FOUND')

    // 4. Resolve assignment and amount
    const assignments = await this.assignmentsRepo.listByConceptId(conceptId)
    const resolved = await this.resolveAssignment(assignments, unit, concept.condominiumId!)

    return success({
      concept: { ...concept, currency },
      assignment: resolved?.assignment ?? null,
      unitAmount: resolved?.unitAmount ?? null,
    })
  }

  private async resolveAssignment(
    assignments: TPaymentConceptAssignment[],
    unit: TUnitInfo,
    condominiumId: string
  ): Promise<{
    assignment: { scopeType: string; distributionMethod: string; totalAmount: number }
    unitAmount: number
  } | null> {
    // Unit-specific
    const unitAssignment = assignments.find(a => a.scopeType === 'unit' && a.unitId === unit.id)
    if (unitAssignment) {
      const amount = Number(unitAssignment.amount)
      return {
        assignment: {
          scopeType: 'unit',
          distributionMethod: unitAssignment.distributionMethod,
          totalAmount: amount,
        },
        unitAmount: amount,
      }
    }

    // Building-level
    const buildingAssignment = assignments.find(
      a => a.scopeType === 'building' && a.buildingId === unit.buildingId
    )
    if (buildingAssignment) {
      const unitAmount = await this.calculateUnitShare(buildingAssignment, unit, async () => {
        const units = await this.unitsRepo.getByBuildingId(unit.buildingId)
        return units.filter(u => u.isActive)
      })
      return {
        assignment: {
          scopeType: 'building',
          distributionMethod: buildingAssignment.distributionMethod,
          totalAmount: Number(buildingAssignment.amount),
        },
        unitAmount,
      }
    }

    // Condominium-level
    const condoAssignment = assignments.find(a => a.scopeType === 'condominium')
    if (condoAssignment) {
      const unitAmount = await this.calculateUnitShare(condoAssignment, unit, async () => {
        const units = await this.unitsRepo.getByCondominiumId(condominiumId)
        return units.filter(u => u.isActive)
      })
      return {
        assignment: {
          scopeType: 'condominium',
          distributionMethod: condoAssignment.distributionMethod,
          totalAmount: Number(condoAssignment.amount),
        },
        unitAmount,
      }
    }

    return null
  }

  private async calculateUnitShare(
    assignment: TPaymentConceptAssignment,
    unit: TUnitInfo,
    getUnits: () => Promise<TUnitInfo[]>
  ): Promise<number> {
    const total = Number(assignment.amount)
    const units = await getUnits()

    switch (assignment.distributionMethod) {
      case 'by_aliquot': {
        const unitsWithAliquot = units.filter(
          u => u.aliquotPercentage != null && parseAmount(u.aliquotPercentage) > 0
        )
        if (unitsWithAliquot.length === 0) return 0
        const totalAliquot = unitsWithAliquot.reduce(
          (sum, u) => sum + parseAmount(u.aliquotPercentage),
          0
        )
        const proportion = parseAmount(unit.aliquotPercentage) / totalAliquot
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
}
