import type { TBudget, TBudgetItemCreate } from '@packages/domain'
import type { TServiceResult } from '@packages/services'
import { success, failure } from '@packages/services'
import type { BudgetsRepository } from '@packages/database'
import type { BudgetItemsRepository } from '@packages/database'

interface ICreateBudgetItemInput {
  expenseCategoryId: string | null
  description: string
  budgetedAmount: string
  notes: string | null
}

interface ICreateBudgetInput {
  condominiumId: string
  name: string
  description: string | null
  budgetType: TBudget['budgetType']
  periodYear: number
  periodMonth: number | null
  currencyId: string
  reserveFundPercentage: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
  createdBy: string | null
  items: ICreateBudgetItemInput[]
}

export class CreateBudgetService {
  constructor(
    private budgetsRepo: BudgetsRepository,
    private budgetItemsRepo: BudgetItemsRepository
  ) {}

  async execute(input: ICreateBudgetInput): Promise<TServiceResult<TBudget>> {
    // Validate items not empty
    if (!input.items || input.items.length === 0) {
      return failure('El presupuesto debe tener al menos un ítem', 'BAD_REQUEST')
    }

    // Validate periodMonth required for monthly/quarterly budgets
    if (input.budgetType !== 'annual' && input.periodMonth === null) {
      return failure(
        'El mes es requerido para presupuestos mensuales o trimestrales',
        'BAD_REQUEST'
      )
    }

    // Check for duplicate budget in same period
    const existing = await this.budgetsRepo.getByCondominiumAndPeriod(
      input.condominiumId,
      input.periodYear,
      input.periodMonth,
      input.budgetType
    )

    if (existing) {
      return failure(`Ya existe un presupuesto ${input.budgetType} para este período`, 'CONFLICT')
    }

    // Calculate totalAmount from items
    const totalAmount = input.items
      .reduce((sum, item) => sum + parseFloat(item.budgetedAmount), 0)
      .toFixed(2)

    // Create budget (totalAmount is calculated, not part of TBudgetCreate)
    const budget = await this.budgetsRepo.create({
      condominiumId: input.condominiumId,
      name: input.name,
      description: input.description,
      budgetType: input.budgetType,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      currencyId: input.currencyId,
      reserveFundPercentage: input.reserveFundPercentage,
      notes: input.notes,
      metadata: input.metadata,
      createdBy: input.createdBy,
      totalAmount,
    })

    // Create budget items
    for (const item of input.items) {
      const itemData: TBudgetItemCreate = {
        budgetId: budget.id,
        expenseCategoryId: item.expenseCategoryId,
        description: item.description,
        budgetedAmount: item.budgetedAmount,
        notes: item.notes,
      }
      await this.budgetItemsRepo.create(itemData)
    }

    return success(budget)
  }
}
