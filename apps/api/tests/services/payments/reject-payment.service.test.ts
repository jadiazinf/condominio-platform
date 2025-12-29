import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPayment } from '@packages/domain'
import { RejectPaymentService } from '@src/services/payments'

type TMockRepository = {
  getById: (id: string) => Promise<TPayment | null>
  rejectPayment: (id: string, rejectedBy: string, notes?: string) => Promise<TPayment | null>
}

describe('RejectPaymentService', function () {
  let service: RejectPaymentService
  let mockRepository: TMockRepository

  const adminUserId = '550e8400-e29b-41d4-a716-446655440099'

  const pendingPayment: TPayment = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    paymentNumber: 'PAY-001',
    userId: '550e8400-e29b-41d4-a716-446655440010',
    unitId: '550e8400-e29b-41d4-a716-446655440020',
    amount: '150.00',
    currencyId: '550e8400-e29b-41d4-a716-446655440050',
    paidAmount: null,
    paidCurrencyId: null,
    exchangeRate: null,
    paymentMethod: 'transfer',
    paymentGatewayId: null,
    paymentDetails: null,
    paymentDate: '2024-01-15',
    registeredAt: new Date(),
    status: 'pending_verification',
    receiptUrl: null,
    receiptNumber: null,
    notes: null,
    metadata: null,
    registeredBy: '550e8400-e29b-41d4-a716-446655440010',
    verifiedBy: null,
    verifiedAt: null,
    verificationNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const completedPayment: TPayment = {
    ...pendingPayment,
    id: '550e8400-e29b-41d4-a716-446655440002',
    paymentNumber: 'PAY-002',
    status: 'completed',
  }

  beforeEach(function () {
    mockRepository = {
      getById: async function (id: string) {
        if (id === pendingPayment.id) return pendingPayment
        if (id === completedPayment.id) return completedPayment
        return null
      },
      rejectPayment: async function (id: string, rejectedBy: string, notes?: string) {
        if (id === pendingPayment.id) {
          return {
            ...pendingPayment,
            status: 'rejected' as const,
            verifiedBy: rejectedBy,
            verifiedAt: new Date(),
            verificationNotes: notes ?? null,
          }
        }
        return null
      },
    }
    service = new RejectPaymentService(mockRepository as never)
  })

  describe('execute', function () {
    it('should reject payment successfully', async function () {
      const result = await service.execute({
        paymentId: pendingPayment.id,
        rejectedByUserId: adminUserId,
        notes: 'Receipt does not match payment details',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.payment.status).toBe('rejected')
        expect(result.data.payment.verifiedBy).toBe(adminUserId)
        expect(result.data.payment.verifiedAt).toBeDefined()
        expect(result.data.payment.verificationNotes).toBe('Receipt does not match payment details')
        expect(result.data.message).toBe('Payment rejected')
      }
    })

    it('should reject payment without notes', async function () {
      const result = await service.execute({
        paymentId: pendingPayment.id,
        rejectedByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.payment.status).toBe('rejected')
        expect(result.data.payment.verificationNotes).toBeNull()
      }
    })

    it('should return NOT_FOUND error when payment does not exist', async function () {
      const result = await service.execute({
        paymentId: '550e8400-e29b-41d4-a716-446655440999',
        rejectedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Payment not found')
      }
    })

    it('should return BAD_REQUEST error when payment is not pending verification', async function () {
      const result = await service.execute({
        paymentId: completedPayment.id,
        rejectedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('not pending verification')
        expect(result.error).toContain('Current status: completed')
      }
    })

    it('should not allow rejecting already rejected payment', async function () {
      const rejectedPayment: TPayment = {
        ...pendingPayment,
        id: '550e8400-e29b-41d4-a716-446655440003',
        status: 'rejected',
      }

      mockRepository.getById = async function (id: string) {
        if (id === rejectedPayment.id) return rejectedPayment
        return null
      }

      const result = await service.execute({
        paymentId: rejectedPayment.id,
        rejectedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Current status: rejected')
      }
    })
  })
})
