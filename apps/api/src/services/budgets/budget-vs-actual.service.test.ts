import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { BudgetVsActualService } from './budget-vs-actual.service'

describe('BudgetVsActualService', () => {
  let service: BudgetVsActualService
  let budgetsRepo: Record<string, ReturnType<typeof mock>>
  let budgetItemsRepo: Record<string, ReturnType<typeof mock>>
  let expensesRepo: Record<string, ReturnType<typeof mock>>

  const mockBudget = {
    id: 'budget-1',
    condominiumId: 'condo-1',
    name: 'Presupuesto Enero 2026',
    budgetType: 'monthly' as const,
    periodYear: 2026,
    periodMonth: 1,
    currencyId: 'currency-1',
    status: 'active' as const,
    totalAmount: '1000.00',
    reserveFundPercentage: '10',
  }

  const mockBudgetItems = [
    {
      id: 'item-1',
      budgetId: 'budget-1',
      expenseCategoryId: 'cat-1',
      description: 'Limpieza',
      budgetedAmount: '600.00',
    },
    {
      id: 'item-2',
      budgetId: 'budget-1',
      expenseCategoryId: 'cat-2',
      description: 'Vigilancia',
      budgetedAmount: '400.00',
    },
  ]

  const mockExpenses = [
    {
      id: 'exp-1',
      condominiumId: 'condo-1',
      expenseCategoryId: 'cat-1',
      amount: '550.00',
      status: 'paid',
      expenseDate: '2026-01-15',
    },
    {
      id: 'exp-2',
      condominiumId: 'condo-1',
      expenseCategoryId: 'cat-2',
      amount: '200.00',
      status: 'paid',
      expenseDate: '2026-01-20',
    },
    {
      id: 'exp-3',
      condominiumId: 'condo-1',
      expenseCategoryId: 'cat-1',
      amount: '100.00',
      status: 'paid',
      expenseDate: '2026-01-25',
    },
  ]

  beforeEach(() => {
    budgetsRepo = {
      getById: mock(() => Promise.resolve(mockBudget)),
    }

    budgetItemsRepo = {
      getByBudgetId: mock(() => Promise.resolve(mockBudgetItems)),
    }

    expensesRepo = {
      getByDateRange: mock(() => Promise.resolve(mockExpenses)),
    }

    service = new BudgetVsActualService(
      budgetsRepo as never,
      budgetItemsRepo as never,
      expensesRepo as never
    )
  })

  it('should compare budgeted vs actual expenses by category', async () => {
    const result = await service.execute({ budgetId: 'budget-1' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items).toHaveLength(2)

      // cat-1: budgeted 600, actual 550 + 100 = 650, variance = -50
      const cat1 = result.data.items.find(i => i.expenseCategoryId === 'cat-1')
      expect(cat1?.budgetedAmount).toBe('600.00')
      expect(cat1?.actualAmount).toBe('650.00')
      expect(cat1?.variance).toBe('-50.00')

      // cat-2: budgeted 400, actual 200, variance = 200
      const cat2 = result.data.items.find(i => i.expenseCategoryId === 'cat-2')
      expect(cat2?.budgetedAmount).toBe('400.00')
      expect(cat2?.actualAmount).toBe('200.00')
      expect(cat2?.variance).toBe('200.00')

      // Totals
      expect(result.data.totalBudgeted).toBe('1000.00')
      expect(result.data.totalActual).toBe('850.00')
      expect(result.data.totalVariance).toBe('150.00')
    }
  })

  it('should fail if budget not found', async () => {
    budgetsRepo.getById = mock(() => Promise.resolve(null))
    service = new BudgetVsActualService(
      budgetsRepo as never,
      budgetItemsRepo as never,
      expensesRepo as never
    )

    const result = await service.execute({ budgetId: 'nonexistent' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND')
    }
  })

  it('should handle categories with no actual expenses', async () => {
    expensesRepo.getByDateRange = mock(() => Promise.resolve([]))
    service = new BudgetVsActualService(
      budgetsRepo as never,
      budgetItemsRepo as never,
      expensesRepo as never
    )

    const result = await service.execute({ budgetId: 'budget-1' })

    expect(result.success).toBe(true)
    if (result.success) {
      const cat1 = result.data.items.find(i => i.expenseCategoryId === 'cat-1')
      expect(cat1?.actualAmount).toBe('0.00')
      expect(cat1?.variance).toBe('600.00')
    }
  })
})
