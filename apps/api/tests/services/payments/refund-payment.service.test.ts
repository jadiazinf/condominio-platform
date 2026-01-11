import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPayment } from '@packages/domain'
import { RefundPaymentService } from '@src/services/payments'

type TMockRepository = {
  getById: (id: string) => Promise<TPayment | null>
  update: (id: string, data: unknown) => Promise<TPayment | null>
}

describe('RefundPaymentService', function () {
  let service: RefundPaymentService
  let mockRepository: TMockRepository

  const mockPayment: TPayment = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    paymentNumber: 'PAY-001',
    userId: '550e8400-e29b-41d4-a716-446655440002',
    unitId: '550e8400-e29b-41d4-a716-446655440003',
    amount: '100.00',
    currencyId: '550e8400-e29b-41d4-a716-446655440004',
    paidAmount: null,
    paidCurrencyId: null,
    exchangeRate: null,
    paymentMethod: 'transfer',
    paymentGatewayId: null,
    paymentDetails: null,
    paymentDate: '2025-01-01',
    registeredAt: new Date(),
    status: 'completed',
    receiptUrl: null,
    receiptNumber: null,
    notes: null,
    metadata: null,
    registeredBy: '550e8400-e29b-41d4-a716-446655440002',
    verifiedBy: '550e8400-e29b-41d4-a716-446655440005',
    verifiedAt: new Date(),
    verificationNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(function () {
    mockRepository = {
      getById: async function () {
        return mockPayment
      },
      update: async function (id, data: any) {
        return { ...mockPayment, ...data }
      },
    }

    service = new RefundPaymentService(mockRepository as never)
  })

  describe('execute', function () {
    it('should refund payment successfully', async function () {
      const result = await service.execute({
        paymentId: mockPayment.id,
        refundReason: 'Customer requested refund',
        refundedByUserId: mockPayment.verifiedBy!,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.payment.status).toBe('refunded')
        expect(result.data.message).toBe('Payment refunded successfully')
      }
    })

    it('should fail when payment not found', async function () {
      mockRepository.getById = async function () {
        return null
      }

      const result = await service.execute({
        paymentId: 'non-existent',
        refundReason: 'Customer requested refund',
        refundedByUserId: mockPayment.verifiedBy!,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when payment is not completed', async function () {
      mockRepository.getById = async function () {
        return { ...mockPayment, status: 'pending_verification' }
      }

      const result = await service.execute({
        paymentId: mockPayment.id,
        refundReason: 'Customer requested refund',
        refundedByUserId: mockPayment.verifiedBy!,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Only completed payments can be refunded')
      }
    })

    it('should fail when refund reason is not provided', async function () {
      const result = await service.execute({
        paymentId: mockPayment.id,
        refundReason: '',
        refundedByUserId: mockPayment.verifiedBy!,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Refund reason is required')
      }
    })

    it('should fail when refund reason is only whitespace', async function () {
      const result = await service.execute({
        paymentId: mockPayment.id,
        refundReason: '   ',
        refundedByUserId: mockPayment.verifiedBy!,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Refund reason is required')
      }
    })
  })
})
