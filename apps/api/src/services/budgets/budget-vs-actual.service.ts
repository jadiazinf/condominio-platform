import type { TServiceResult } from '@packages/services'
import { success, failure } from '@packages/services'
import type {
  BudgetsRepository,
  BudgetItemsRepository,
  ExpensesRepository,
} from '@packages/database'

interface IBudgetVsActualInput {
  budgetId: string
}

interface IBudgetVsActualItem {
  budgetItemId: string
  expenseCategoryId: string | null
  description: string
  budgetedAmount: string
  actualAmount: string
  variance: string
}

interface IBudgetVsActualResult {
  budgetId: string
  budgetName: string
  periodYear: number
  periodMonth: number | null
  items: IBudgetVsActualItem[]
  totalBudgeted: string
  totalActual: string
  totalVariance: string
}

export class BudgetVsActualService {
  constructor(
    private budgetsRepo: BudgetsRepository,
    private budgetItemsRepo: BudgetItemsRepository,
    private expensesRepo: ExpensesRepository
  ) {}

  async execute(input: IBudgetVsActualInput): Promise<TServiceResult<IBudgetVsActualResult>> {
    const budget = await this.budgetsRepo.getById(input.budgetId)

    if (!budget) {
      return failure('Presupuesto no encontrado', 'NOT_FOUND')
    }

    const budgetItems = await this.budgetItemsRepo.getByBudgetId(budget.id)

    // Determine date range based on budget period
    const { startDate, endDate } = this.getPeriodDateRange(
      budget.periodYear,
      budget.periodMonth,
      budget.budgetType
    )

    const expenses = await this.expensesRepo.getByDateRange(
      startDate,
      endDate,
      budget.condominiumId
    )

    // Group actual expenses by category
    const actualByCategory = new Map<string, number>()
    for (const expense of expenses) {
      if (expense.status !== 'paid') continue
      const catId = expense.expenseCategoryId ?? 'uncategorized'
      const current = actualByCategory.get(catId) ?? 0
      actualByCategory.set(catId, current + parseFloat(expense.amount))
    }

    // Build comparison items
    let totalBudgeted = 0
    let totalActual = 0

    const items: IBudgetVsActualItem[] = budgetItems.map(item => {
      const budgeted = parseFloat(item.budgetedAmount)
      const catId = item.expenseCategoryId ?? 'uncategorized'
      const actual = actualByCategory.get(catId) ?? 0
      const variance = budgeted - actual

      totalBudgeted += budgeted
      totalActual += actual

      return {
        budgetItemId: item.id,
        expenseCategoryId: item.expenseCategoryId,
        description: item.description,
        budgetedAmount: budgeted.toFixed(2),
        actualAmount: actual.toFixed(2),
        variance: variance.toFixed(2),
      }
    })

    return success({
      budgetId: budget.id,
      budgetName: budget.name,
      periodYear: budget.periodYear,
      periodMonth: budget.periodMonth,
      items,
      totalBudgeted: totalBudgeted.toFixed(2),
      totalActual: totalActual.toFixed(2),
      totalVariance: (totalBudgeted - totalActual).toFixed(2),
    })
  }

  private getPeriodDateRange(
    year: number,
    month: number | null,
    budgetType: string
  ): { startDate: string; endDate: string } {
    if (budgetType === 'annual' || month === null) {
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      }
    }

    if (budgetType === 'quarterly') {
      const quarterStart = month
      const quarterEnd = month + 2
      const lastDay = new Date(year, quarterEnd, 0).getDate()
      return {
        startDate: `${year}-${String(quarterStart).padStart(2, '0')}-01`,
        endDate: `${year}-${String(quarterEnd).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      }
    }

    // Monthly
    const lastDay = new Date(year, month, 0).getDate()
    return {
      startDate: `${year}-${String(month).padStart(2, '0')}-01`,
      endDate: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    }
  }
}
