import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { CreateBudgetService } from './create-budget.service'

describe('CreateBudgetService', () => {
  let service: CreateBudgetService
  let budgetsRepo: Record<string, ReturnType<typeof mock>>
  let budgetItemsRepo: Record<string, ReturnType<typeof mock>>

  const baseBudgetInput = {
    condominiumId: 'condo-1',
    name: 'Presupuesto Enero 2026',
    description: 'Presupuesto mensual',
    budgetType: 'monthly' as const,
    periodYear: 2026,
    periodMonth: 1,
    currencyId: 'currency-1',
    reserveFundPercentage: '10',
    notes: null,
    metadata: null,
    createdBy: 'user-1',
    items: [
      {
        expenseCategoryId: 'cat-1',
        description: 'Limpieza',
        budgetedAmount: '500.00',
        notes: null,
      },
      {
        expenseCategoryId: 'cat-2',
        description: 'Vigilancia',
        budgetedAmount: '300.00',
        notes: null,
      },
    ],
  }

  beforeEach(() => {
    budgetsRepo = {
      getByCondominiumAndPeriod: mock(() => Promise.resolve(null)),
      create: mock(() =>
        Promise.resolve({
          id: 'budget-1',
          ...baseBudgetInput,
          status: 'draft',
          totalAmount: '800.00',
          approvedBy: null,
          approvedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      update: mock(() => Promise.resolve({})),
    }

    budgetItemsRepo = {
      create: mock(() =>
        Promise.resolve({
          id: 'item-1',
          budgetId: 'budget-1',
          expenseCategoryId: 'cat-1',
          description: 'Limpieza',
          budgetedAmount: '500.00',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      getByBudgetId: mock(() => Promise.resolve([])),
    }

    service = new CreateBudgetService(budgetsRepo as never, budgetItemsRepo as never)
  })

  it('should create a budget with items and calculate totalAmount', async () => {
    const result = await service.execute(baseBudgetInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('budget-1')
    }

    expect(budgetsRepo.getByCondominiumAndPeriod).toHaveBeenCalledTimes(1)
    expect(budgetsRepo.create).toHaveBeenCalledTimes(1)

    // totalAmount should be sum of items: 500 + 300 = 800
    const createCall = budgetsRepo.create!.mock.calls[0]!
    expect(createCall[0].totalAmount).toBe('800.00')

    // Should create 2 items
    expect(budgetItemsRepo.create).toHaveBeenCalledTimes(2)
  })

  it('should fail if budget already exists for period', async () => {
    budgetsRepo.getByCondominiumAndPeriod = mock(() =>
      Promise.resolve({ id: 'existing-budget', status: 'draft' })
    )

    service = new CreateBudgetService(budgetsRepo as never, budgetItemsRepo as never)

    const result = await service.execute(baseBudgetInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('CONFLICT')
    }
  })

  it('should fail if no items provided', async () => {
    const result = await service.execute({ ...baseBudgetInput, items: [] })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('BAD_REQUEST')
    }
  })

  it('should fail if periodMonth missing for monthly budget', async () => {
    const result = await service.execute({
      ...baseBudgetInput,
      periodMonth: null,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('BAD_REQUEST')
    }
  })

  it('should allow null periodMonth for annual budget', async () => {
    const result = await service.execute({
      ...baseBudgetInput,
      budgetType: 'annual',
      periodMonth: null,
    })

    expect(result.success).toBe(true)
  })
})
