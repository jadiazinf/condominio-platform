import { describe, it, expect, beforeEach } from 'bun:test'
import type { TQuota } from '@packages/domain'
import { GetPendingQuotasByUnitService } from '@src/services/quotas'

type TMockRepository = {
  getPendingByUnit: (unitId: string) => Promise<TQuota[]>
}

describe('GetPendingQuotasByUnitService', function () {
  let service: GetPendingQuotasByUnitService
  let mockRepository: TMockRepository

  const unitId = '550e8400-e29b-41d4-a716-446655440020'

  const mockQuotas: TQuota[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      unitId,
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
      unitId,
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
      unitId,
      paymentConceptId: '550e8400-e29b-41d4-a716-446655440030',
      periodYear: 2024,
      periodMonth: 3,
      periodDescription: 'March 2024',
      baseAmount: '150.00',
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      interestAmount: '0',
      amountInBaseCurrency: null,
      exchangeRateUsed: null,
      issueDate: '2024-03-01',
      dueDate: '2024-03-15',
      status: 'pending',
      paidAmount: '0',
      balance: '150.00',
      notes: null,
      metadata: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getPendingByUnit: async function (requestedUnitId: string) {
        return mockQuotas.filter(function (q) {
          return q.unitId === requestedUnitId && q.status === 'pending'
        })
      },
    }
    service = new GetPendingQuotasByUnitService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return only pending quotas for a unit', async function () {
      const result = await service.execute({ unitId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(q => q.status === 'pending')).toBe(true)
        expect(result.data.every(q => q.unitId === unitId)).toBe(true)
      }
    })

    it('should return empty array when unit has no pending quotas', async function () {
      const result = await service.execute({ unitId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
