import { describe, it, expect, beforeEach } from 'bun:test'
import type { TExpense } from '@packages/domain'
import { GetPendingApprovalExpensesService } from '@src/services/expenses'

type TMockRepository = {
  getPendingApproval: () => Promise<TExpense[]>
}

describe('GetPendingApprovalExpensesService', function () {
  let service: GetPendingApprovalExpensesService
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
      getPendingApproval: async function () {
        return mockExpenses
      },
    }
    service = new GetPendingApprovalExpensesService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all expenses pending approval', async function () {
      const result = await service.execute()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(e => e.status === 'pending')).toBe(true)
      }
    })

    it('should return empty array when no expenses pending', async function () {
      mockRepository.getPendingApproval = async function () {
        return []
      }

      const result = await service.execute()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
