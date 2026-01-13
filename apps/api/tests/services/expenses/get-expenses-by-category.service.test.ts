import { describe, it, expect, beforeEach } from 'bun:test'
import type { TExpense } from '@packages/domain'
import { GetExpensesByCategoryService } from '@src/services/expenses'

type TMockRepository = {
  getByCategoryId: (categoryId: string) => Promise<TExpense[]>
}

describe('GetExpensesByCategoryService', function () {
  let service: GetExpensesByCategoryService
  let mockRepository: TMockRepository

  const categoryId = '550e8400-e29b-41d4-a716-446655440020'

  const mockExpenses: TExpense[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      condominiumId: '550e8400-e29b-41d4-a716-446655440010',
      buildingId: null,
      expenseCategoryId: categoryId,
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
      condominiumId: '550e8400-e29b-41d4-a716-446655440010',
      buildingId: null,
      expenseCategoryId: categoryId,
      description: 'Quarterly maintenance',
      expenseDate: '2024-01-20',
      amount: '1500.00',
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
      getByCategoryId: async function (requestedCategoryId: string) {
        return mockExpenses.filter(function (e) {
          return e.expenseCategoryId === requestedCategoryId
        })
      },
    }
    service = new GetExpensesByCategoryService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all expenses for a category', async function () {
      const result = await service.execute({ categoryId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(e => e.expenseCategoryId === categoryId)).toBe(true)
      }
    })

    it('should return empty array when category has no expenses', async function () {
      const result = await service.execute({ categoryId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
