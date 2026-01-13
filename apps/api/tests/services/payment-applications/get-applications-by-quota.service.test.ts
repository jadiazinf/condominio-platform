import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPaymentApplication } from '@packages/domain'
import { GetApplicationsByQuotaService } from '@src/services/payment-applications'

type TMockRepository = {
  getByQuotaId: (quotaId: string) => Promise<TPaymentApplication[]>
}

describe('GetApplicationsByQuotaService', function () {
  let service: GetApplicationsByQuotaService
  let mockRepository: TMockRepository

  const quotaId = '550e8400-e29b-41d4-a716-446655440020'

  const mockApplications: TPaymentApplication[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      paymentId: '550e8400-e29b-41d4-a716-446655440001',
      quotaId,
      appliedAmount: '100.00',
      appliedToPrincipal: '90.00',
      appliedToInterest: '10.00',
      registeredBy: null,
      appliedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440011',
      paymentId: '550e8400-e29b-41d4-a716-446655440002',
      quotaId,
      appliedAmount: '75.00',
      appliedToPrincipal: '75.00',
      appliedToInterest: '0',
      registeredBy: null,
      appliedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByQuotaId: async function (qId: string) {
        return mockApplications.filter(function (a) {
          return a.quotaId === qId
        })
      },
    }
    service = new GetApplicationsByQuotaService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all applications for a quota', async function () {
      const result = await service.execute({ quotaId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(a => a.quotaId === quotaId)).toBe(true)
      }
    })

    it('should return empty array when quota has no applications', async function () {
      const result = await service.execute({ quotaId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
