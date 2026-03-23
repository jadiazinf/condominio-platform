import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { CalculateOrdinaryQuotaService } from './calculate-ordinary-quota.service'

describe('CalculateOrdinaryQuotaService', () => {
  let service: CalculateOrdinaryQuotaService
  let budgetsRepo: Record<string, ReturnType<typeof mock>>
  let budgetItemsRepo: Record<string, ReturnType<typeof mock>>
  let unitsRepo: Record<string, ReturnType<typeof mock>>

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

  const mockUnits = [
    {
      id: 'unit-1',
      unitNumber: '1A',
      buildingId: 'building-1',
      aliquotPercentage: '25.00',
      isActive: true,
    },
    {
      id: 'unit-2',
      unitNumber: '2A',
      buildingId: 'building-1',
      aliquotPercentage: '35.00',
      isActive: true,
    },
    {
      id: 'unit-3',
      unitNumber: '3A',
      buildingId: 'building-1',
      aliquotPercentage: '40.00',
      isActive: true,
    },
  ]

  beforeEach(() => {
    budgetsRepo = {
      getById: mock(() => Promise.resolve(mockBudget)),
    }

    budgetItemsRepo = {
      getByBudgetId: mock(() =>
        Promise.resolve([
          { id: 'item-1', budgetedAmount: '600.00' },
          { id: 'item-2', budgetedAmount: '400.00' },
        ])
      ),
    }

    unitsRepo = {
      getByCondominiumId: mock(() => Promise.resolve(mockUnits)),
    }

    service = new CalculateOrdinaryQuotaService(
      budgetsRepo as never,
      budgetItemsRepo as never,
      unitsRepo as never
    )
  })

  it('should calculate quota per unit based on aliquot and budget total + reserve fund', async () => {
    // totalAmount = 1000, reserveFundPercentage = 10%
    // totalWithReserve = 1000 * (1 + 10/100) = 1100
    // unit-1 (25%): 1100 * 0.25 = 275.00
    // unit-2 (35%): 1100 * 0.35 = 385.00
    // unit-3 (40%): 1100 * 0.40 = 440.00

    const result = await service.execute({ budgetId: 'budget-1' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.quotas).toHaveLength(3)

      const q1 = result.data.quotas.find((q: { unitId: string }) => q.unitId === 'unit-1')
      expect(q1?.amount).toBe('275.00')

      const q2 = result.data.quotas.find((q: { unitId: string }) => q.unitId === 'unit-2')
      expect(q2?.amount).toBe('385.00')

      const q3 = result.data.quotas.find((q: { unitId: string }) => q.unitId === 'unit-3')
      expect(q3?.amount).toBe('440.00')

      expect(result.data.budgetTotal).toBe('1000.00')
      expect(result.data.reserveFundPercentage).toBe('10')
      expect(result.data.totalWithReserve).toBe('1100.00')
    }
  })

  it('should fail if budget not found', async () => {
    budgetsRepo.getById = mock(() => Promise.resolve(null))
    service = new CalculateOrdinaryQuotaService(
      budgetsRepo as never,
      budgetItemsRepo as never,
      unitsRepo as never
    )

    const result = await service.execute({ budgetId: 'nonexistent' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND')
    }
  })

  it('should fail if budget is still draft', async () => {
    budgetsRepo.getById = mock(() => Promise.resolve({ ...mockBudget, status: 'draft' }))
    service = new CalculateOrdinaryQuotaService(
      budgetsRepo as never,
      budgetItemsRepo as never,
      unitsRepo as never
    )

    const result = await service.execute({ budgetId: 'budget-1' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('BAD_REQUEST')
    }
  })

  it('should skip units without aliquot percentage', async () => {
    unitsRepo.getByCondominiumId = mock(() =>
      Promise.resolve([
        ...mockUnits,
        { id: 'unit-no-aliquot', unitNumber: '4A', aliquotPercentage: null, isActive: true },
      ])
    )
    service = new CalculateOrdinaryQuotaService(
      budgetsRepo as never,
      budgetItemsRepo as never,
      unitsRepo as never
    )

    const result = await service.execute({ budgetId: 'budget-1' })

    expect(result.success).toBe(true)
    if (result.success) {
      // Should only calculate for units with aliquot
      expect(result.data.quotas).toHaveLength(3)
      expect(result.data.skippedUnits).toHaveLength(1)
      expect(result.data.skippedUnits[0]!.unitId).toBe('unit-no-aliquot')
    }
  })

  it('should handle zero reserve fund percentage', async () => {
    budgetsRepo.getById = mock(() => Promise.resolve({ ...mockBudget, reserveFundPercentage: '0' }))
    service = new CalculateOrdinaryQuotaService(
      budgetsRepo as never,
      budgetItemsRepo as never,
      unitsRepo as never
    )

    const result = await service.execute({ budgetId: 'budget-1' })

    expect(result.success).toBe(true)
    if (result.success) {
      // totalWithReserve = 1000 (no extra)
      // unit-1 (25%): 1000 * 0.25 = 250.00
      const q1 = result.data.quotas.find((q: { unitId: string }) => q.unitId === 'unit-1')
      expect(q1?.amount).toBe('250.00')
      expect(result.data.totalWithReserve).toBe('1000.00')
    }
  })

  it('should fail if no active units found', async () => {
    unitsRepo.getByCondominiumId = mock(() => Promise.resolve([]))
    service = new CalculateOrdinaryQuotaService(
      budgetsRepo as never,
      budgetItemsRepo as never,
      unitsRepo as never
    )

    const result = await service.execute({ budgetId: 'budget-1' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('BAD_REQUEST')
    }
  })
})
