import { describe, it, expect, beforeEach } from 'bun:test'
import type { TExpense, TExpenseStatus } from '@packages/domain'
import { GetExpensesByStatusService } from '@src/services/expenses'

type TMockRepository = {
  getByStatus: (status: TExpenseStatus) => Promise<TExpense[]>
}

describe('GetExpensesByStatusService', function () {
  let service: GetExpensesByStatusService
  let mockRepository: TMockRepository

  const mockExpenses: TExpense[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      condominiumId: '550e8400-e29b-41d4-a716-446655440010',
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
      status: 'pending',
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
      status: 'approved',
      approvedBy: '550e8400-e29b-41d4-a716-446655440040',
      approvedAt: new Date(),
      notes: null,
      metadata: null,
      createdBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByStatus: async function (status: TExpenseStatus) {
        return mockExpenses.filter(function (e) {
          return e.status === status
        })
      },
    }
    service = new GetExpensesByStatusService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return expenses with pending status', async function () {
      const result = await service.execute({ status: 'pending' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every((e) => e.status === 'pending')).toBe(true)
      }
    })

    it('should return expenses with approved status', async function () {
      const result = await service.execute({ status: 'approved' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every((e) => e.status === 'approved')).toBe(true)
      }
    })

    it('should return empty array when no expenses match status', async function () {
      const result = await service.execute({ status: 'rejected' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
