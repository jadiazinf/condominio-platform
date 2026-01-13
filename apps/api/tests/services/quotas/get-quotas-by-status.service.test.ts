import { describe, it, expect, beforeEach } from 'bun:test'
import type { TQuota } from '@packages/domain'
import { GetQuotasByStatusService } from '@src/services/quotas'

type TMockRepository = {
  getByStatus: (status: TQuota['status']) => Promise<TQuota[]>
}

describe('GetQuotasByStatusService', function () {
  let service: GetQuotasByStatusService
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
      status: 'paid',
      paidAmount: '150.00',
      balance: '0',
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
      periodMonth: 1,
      periodDescription: 'January 2024',
      baseAmount: '200.00',
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      interestAmount: '10.00',
      amountInBaseCurrency: null,
      exchangeRateUsed: null,
      issueDate: '2024-01-01',
      dueDate: '2024-01-15',
      status: 'overdue',
      paidAmount: '0',
      balance: '210.00',
      notes: null,
      metadata: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByStatus: async function (status: TQuota['status']) {
        return mockQuotas.filter(function (q) {
          return q.status === status
        })
      },
    }
    service = new GetQuotasByStatusService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return quotas with pending status', async function () {
      const result = await service.execute({ status: 'pending' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every(q => q.status === 'pending')).toBe(true)
      }
    })

    it('should return quotas with paid status', async function () {
      const result = await service.execute({ status: 'paid' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every(q => q.status === 'paid')).toBe(true)
      }
    })

    it('should return quotas with overdue status', async function () {
      const result = await service.execute({ status: 'overdue' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every(q => q.status === 'overdue')).toBe(true)
      }
    })

    it('should return empty array when no quotas match status', async function () {
      const result = await service.execute({ status: 'cancelled' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
