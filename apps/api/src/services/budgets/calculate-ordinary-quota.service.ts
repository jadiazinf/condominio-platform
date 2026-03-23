import type { TServiceResult } from '@packages/services'
import { success, failure } from '@packages/services'
import type { BudgetsRepository, BudgetItemsRepository, UnitsRepository } from '@packages/database'

interface ICalculateInput {
  budgetId: string
}

interface IUnitQuota {
  unitId: string
  unitNumber: string
  aliquotPercentage: string
  amount: string
}

interface ISkippedUnit {
  unitId: string
  unitNumber: string
  reason: string
}

interface ICalculateResult {
  budgetId: string
  budgetTotal: string
  reserveFundPercentage: string
  totalWithReserve: string
  quotas: IUnitQuota[]
  skippedUnits: ISkippedUnit[]
}

export class CalculateOrdinaryQuotaService {
  constructor(
    private budgetsRepo: BudgetsRepository,
    private budgetItemsRepo: BudgetItemsRepository,
    private unitsRepo: UnitsRepository
  ) {}

  async execute(input: ICalculateInput): Promise<TServiceResult<ICalculateResult>> {
    const budget = await this.budgetsRepo.getById(input.budgetId)

    if (!budget) {
      return failure('Presupuesto no encontrado', 'NOT_FOUND')
    }

    if (budget.status === 'draft') {
      return failure(
        'El presupuesto debe estar aprobado o activo para calcular cuotas',
        'BAD_REQUEST'
      )
    }

    const units = await this.unitsRepo.getByCondominiumId(budget.condominiumId)

    if (!units || units.length === 0) {
      return failure('No se encontraron unidades activas en el condominio', 'BAD_REQUEST')
    }

    const budgetTotal = parseFloat(budget.totalAmount)
    const reservePct = parseFloat(budget.reserveFundPercentage ?? '0')
    const totalWithReserve = budgetTotal * (1 + reservePct / 100)

    const quotas: IUnitQuota[] = []
    const skippedUnits: ISkippedUnit[] = []

    for (const unit of units) {
      if (!unit.aliquotPercentage) {
        skippedUnits.push({
          unitId: unit.id,
          unitNumber: unit.unitNumber,
          reason: 'Sin alícuota asignada',
        })
        continue
      }

      const aliquot = parseFloat(unit.aliquotPercentage) / 100
      const amount = (totalWithReserve * aliquot).toFixed(2)

      quotas.push({
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        aliquotPercentage: unit.aliquotPercentage,
        amount,
      })
    }

    return success({
      budgetId: budget.id,
      budgetTotal: budget.totalAmount,
      reserveFundPercentage: budget.reserveFundPercentage ?? '0',
      totalWithReserve: totalWithReserve.toFixed(2),
      quotas,
      skippedUnits,
    })
  }
}
