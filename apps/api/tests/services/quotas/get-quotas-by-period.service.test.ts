import { describe, it, expect, beforeEach } from 'bun:test'
import type { TQuota } from '@packages/domain'
import { GetQuotasByPeriodService } from '@src/services/quotas'

type TMockRepository = {
  getByPeriod: (year: number, month?: number) => Promise<TQuota[]>
}

describe('GetQuotasByPeriodService', function () {
  let service: GetQuotasByPeriodService
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
      periodMonth: 1,
      periodDescription: 'January 2024',
      baseAmount: '200.00',
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      interestAmount: '0',
      amountInBaseCurrency: null,
      exchangeRateUsed: null,
      issueDate: '2024-01-01',
      dueDate: '2024-01-15',
      status: 'pending',
      paidAmount: '0',
      balance: '200.00',
      notes: null,
      metadata: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440004',
      unitId: '550e8400-e29b-41d4-a716-446655440022',
      paymentConceptId: '550e8400-e29b-41d4-a716-446655440030',
      periodYear: 2023,
      periodMonth: 12,
      periodDescription: 'December 2023',
      baseAmount: '140.00',
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      interestAmount: '0',
      amountInBaseCurrency: null,
      exchangeRateUsed: null,
      issueDate: '2023-12-01',
      dueDate: '2023-12-15',
      status: 'paid',
      paidAmount: '140.00',
      balance: '0',
      notes: null,
      metadata: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByPeriod: async function (year: number, month?: number) {
        return mockQuotas.filter(function (q) {
          if (month !== undefined) {
            return q.periodYear === year && q.periodMonth === month
          }
          return q.periodYear === year
        })
      },
    }
    service = new GetQuotasByPeriodService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return quotas for a specific year and month', async function () {
      const result = await service.execute({ year: 2024, month: 1 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((q) => q.periodYear === 2024 && q.periodMonth === 1)).toBe(true)
      }
    })

    it('should return all quotas for a year when month is not specified', async function () {
      const result = await service.execute({ year: 2024 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(3)
        expect(result.data.every((q) => q.periodYear === 2024)).toBe(true)
      }
    })

    it('should return quotas for a different year', async function () {
      const result = await service.execute({ year: 2023 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0]!.periodYear).toBe(2023)
        expect(result.data[0]!.periodMonth).toBe(12)
      }
    })

    it('should return empty array when no quotas exist for the period', async function () {
      const result = await service.execute({ year: 2022 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })

    it('should return empty array when no quotas exist for specific month', async function () {
      const result = await service.execute({ year: 2024, month: 6 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
