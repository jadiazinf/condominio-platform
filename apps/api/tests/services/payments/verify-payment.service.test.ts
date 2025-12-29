import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPayment } from '@packages/domain'
import { VerifyPaymentService } from '@src/services/payments'

type TMockRepository = {
  getById: (id: string) => Promise<TPayment | null>
  verifyPayment: (id: string, verifiedBy: string, notes?: string) => Promise<TPayment | null>
}

describe('VerifyPaymentService', function () {
  let service: VerifyPaymentService
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
      verifyPayment: async function (id: string, verifiedBy: string, notes?: string) {
        if (id === pendingPayment.id) {
          return {
            ...pendingPayment,
            status: 'completed' as const,
            verifiedBy,
            verifiedAt: new Date(),
            verificationNotes: notes ?? null,
          }
        }
        return null
      },
    }
    service = new VerifyPaymentService(mockRepository as never)
  })

  describe('execute', function () {
    it('should verify payment successfully', async function () {
      const result = await service.execute({
        paymentId: pendingPayment.id,
        verifiedByUserId: adminUserId,
        notes: 'Verified after reviewing receipt',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.payment.status).toBe('completed')
        expect(result.data.payment.verifiedBy).toBe(adminUserId)
        expect(result.data.payment.verifiedAt).toBeDefined()
        expect(result.data.payment.verificationNotes).toBe('Verified after reviewing receipt')
        expect(result.data.message).toBe('Payment verified successfully')
      }
    })

    it('should verify payment without notes', async function () {
      const result = await service.execute({
        paymentId: pendingPayment.id,
        verifiedByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.payment.status).toBe('completed')
        expect(result.data.payment.verificationNotes).toBeNull()
      }
    })

    it('should return NOT_FOUND error when payment does not exist', async function () {
      const result = await service.execute({
        paymentId: '550e8400-e29b-41d4-a716-446655440999',
        verifiedByUserId: adminUserId,
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
        verifiedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('not pending verification')
        expect(result.error).toContain('Current status: completed')
      }
    })
  })
})
