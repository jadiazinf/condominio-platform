import { describe, it, expect, beforeEach } from 'bun:test'
import type { TExpense } from '@packages/domain'
import { GetExpensesByCondominiumService } from '@src/services/expenses'

type TMockRepository = {
  getByCondominiumId: (condominiumId: string) => Promise<TExpense[]>
}

describe('GetExpensesByCondominiumService', function () {
  let service: GetExpensesByCondominiumService
  let mockRepository: TMockRepository

  const condominiumId = '550e8400-e29b-41d4-a716-446655440010'

  const mockExpenses: TExpense[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      condominiumId,
      buildingId: null,
      expenseCategoryId: '550e8400-e29b-41d4-a716-446655440020',
      description: 'Monthly maintenance',
      expenseDate: '2024-01-15',
      amount: '500.00',
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      vendorName: 'Vendor A',
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
      condominiumId,
      buildingId: null,
      expenseCategoryId: '550e8400-e29b-41d4-a716-446655440020',
      description: 'Cleaning supplies',
      expenseDate: '2024-01-20',
      amount: '150.00',
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      vendorName: 'Vendor B',
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
      getByCondominiumId: async function (requestedCondominiumId: string) {
        return mockExpenses.filter(function (e) {
          return e.condominiumId === requestedCondominiumId
        })
      },
    }
    service = new GetExpensesByCondominiumService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all expenses for a condominium', async function () {
      const result = await service.execute({ condominiumId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((e) => e.condominiumId === condominiumId)).toBe(true)
      }
    })

    it('should return empty array when condominium has no expenses', async function () {
      const result = await service.execute({ condominiumId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
