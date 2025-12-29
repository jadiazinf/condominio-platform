import { describe, it, expect, beforeEach } from 'bun:test'
import type { TExpense } from '@packages/domain'
import { GetExpensesByBuildingService } from '@src/services/expenses'

type TMockRepository = {
  getByBuildingId: (buildingId: string) => Promise<TExpense[]>
}

describe('GetExpensesByBuildingService', function () {
  let service: GetExpensesByBuildingService
  let mockRepository: TMockRepository

  const buildingId = '550e8400-e29b-41d4-a716-446655440015'

  const mockExpenses: TExpense[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      condominiumId: '550e8400-e29b-41d4-a716-446655440010',
      buildingId,
      expenseCategoryId: '550e8400-e29b-41d4-a716-446655440020',
      description: 'Elevator maintenance',
      expenseDate: '2024-01-15',
      amount: '800.00',
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      vendorName: 'Elevator Co',
      vendorTaxId: null,
      invoiceNumber: 'INV-001',
      invoiceUrl: null,
      status: 'approved',
      approvedBy: null,
      approvedAt: null,
      notes: null,
      metadata: null,
      createdBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      condominiumId: '550e8400-e29b-41d4-a716-446655440010',
      buildingId,
      expenseCategoryId: '550e8400-e29b-41d4-a716-446655440020',
      description: 'Hallway lighting',
      expenseDate: '2024-01-20',
      amount: '200.00',
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      vendorName: 'Electric Services',
      vendorTaxId: null,
      invoiceNumber: 'INV-002',
      invoiceUrl: null,
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      notes: null,
      metadata: null,
      createdBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByBuildingId: async function (requestedBuildingId: string) {
        return mockExpenses.filter(function (e) {
          return e.buildingId === requestedBuildingId
        })
      },
    }
    service = new GetExpensesByBuildingService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all expenses for a building', async function () {
      const result = await service.execute({ buildingId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((e) => e.buildingId === buildingId)).toBe(true)
      }
    })

    it('should return empty array when building has no expenses', async function () {
      const result = await service.execute({ buildingId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
