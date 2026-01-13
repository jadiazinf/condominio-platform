import { describe, it, expect, beforeEach } from 'bun:test'
import type { TQuota } from '@packages/domain'
import { GetOverdueQuotasService } from '@src/services/quotas'

type TMockRepository = {
  getOverdue: (asOfDate: string) => Promise<TQuota[]>
}

describe('GetOverdueQuotasService', function () {
  let service: GetOverdueQuotasService
  let mockRepository: TMockRepository

  const mockQuotas: TQuota[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      unitId: '550e8400-e29b-41d4-a716-446655440020',
      paymentConceptId: '550e8400-e29b-41d4-a716-446655440030',
      periodYear: 2024,
      periodMonth: 1,
      periodDescription: 'January 2024',
      baseAmount: '150.00',
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      interestAmount: '0',
      amountInBaseCurrency: null,
      exchangeRateUsed: null,
      issueDate: '2024-01-01',
      dueDate: '2024-01-15',
      status: 'pending',
      paidAmount: '0',
      balance: '150.00',
      notes: null,
      metadata: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      unitId: '550e8400-e29b-41d4-a716-446655440020',
      paymentConceptId: '550e8400-e29b-41d4-a716-446655440030',
      periodYear: 2024,
      periodMonth: 2,
      periodDescription: 'February 2024',
      baseAmount: '150.00',
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      interestAmount: '0',
      amountInBaseCurrency: null,
      exchangeRateUsed: null,
      issueDate: '2024-02-01',
      dueDate: '2024-02-15',
      status: 'pending',
      paidAmount: '0',
      balance: '150.00',
      notes: null,
      metadata: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      unitId: '550e8400-e29b-41d4-a716-446655440021',
      paymentConceptId: '550e8400-e29b-41d4-a716-446655440030',
      periodYear: 2024,
      periodMonth: 3,
      periodDescription: 'March 2024',
      baseAmount: '200.00',
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      interestAmount: '0',
      amountInBaseCurrency: null,
      exchangeRateUsed: null,
      issueDate: '2024-03-01',
      dueDate: '2024-03-15',
      status: 'pending',
      paidAmount: '0',
      balance: '200.00',
      notes: null,
      metadata: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getOverdue: async function (asOfDate: string) {
        return mockQuotas.filter(function (q) {
          return q.status === 'pending' && q.dueDate < asOfDate
        })
      },
    }
    service = new GetOverdueQuotasService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return overdue quotas as of a given date', async function () {
      const result = await service.execute({ asOfDate: '2024-02-20' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(q => q.dueDate < '2024-02-20')).toBe(true)
      }
    })

    it('should return all overdue quotas when date is far in the future', async function () {
      const result = await service.execute({ asOfDate: '2024-12-31' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(3)
      }
    })

    it('should return empty array when no quotas are overdue', async function () {
      const result = await service.execute({ asOfDate: '2024-01-01' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
