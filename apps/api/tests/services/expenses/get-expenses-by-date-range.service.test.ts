import { describe, it, expect, beforeEach } from 'bun:test'
import type { TExpense } from '@packages/domain'
import { GetExpensesByDateRangeService } from '@src/services/expenses'

type TMockRepository = {
  getByDateRange: (startDate: string, endDate: string) => Promise<TExpense[]>
}

describe('GetExpensesByDateRangeService', function () {
  let service: GetExpensesByDateRangeService
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
      expenseCategoryId: '550e8400-e29b-41d4-a716-446655440020',
      description: 'Cleaning supplies',
      expenseDate: '2024-02-20',
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
      getByDateRange: async function (startDate: string, endDate: string) {
        return mockExpenses.filter(function (e) {
          return e.expenseDate >= startDate && e.expenseDate <= endDate
        })
      },
    }
    service = new GetExpensesByDateRangeService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return expenses within date range', async function () {
      const result = await service.execute({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        const expense = result.data[0]
        expect(expense).toBeDefined()
        expect(expense!.expenseDate).toBe('2024-01-15')
      }
    })

    it('should return all expenses when range covers all dates', async function () {
      const result = await service.execute({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
      }
    })

    it('should return empty array when no expenses in range', async function () {
      const result = await service.execute({
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
