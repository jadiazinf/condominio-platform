import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPaymentApplication } from '@packages/domain'
import { GetApplicationsByPaymentService } from '@src/services/payment-applications'

type TMockRepository = {
  getByPaymentId: (paymentId: string) => Promise<TPaymentApplication[]>
}

describe('GetApplicationsByPaymentService', function () {
  let service: GetApplicationsByPaymentService
  let mockRepository: TMockRepository

  const paymentId = '550e8400-e29b-41d4-a716-446655440001'

  const mockApplications: TPaymentApplication[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      paymentId,
      quotaId: '550e8400-e29b-41d4-a716-446655440020',
      appliedAmount: '100.00',
      appliedToPrincipal: '90.00',
      appliedToInterest: '10.00',
      registeredBy: null,
      appliedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440011',
      paymentId,
      quotaId: '550e8400-e29b-41d4-a716-446655440021',
      appliedAmount: '50.00',
      appliedToPrincipal: '50.00',
      appliedToInterest: '0',
      registeredBy: null,
      appliedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByPaymentId: async function (pId: string) {
        return mockApplications.filter(function (a) {
          return a.paymentId === pId
        })
      },
    }
    service = new GetApplicationsByPaymentService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all applications for a payment', async function () {
      const result = await service.execute({ paymentId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(a => a.paymentId === paymentId)).toBe(true)
      }
    })

    it('should return empty array when payment has no applications', async function () {
      const result = await service.execute({ paymentId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
