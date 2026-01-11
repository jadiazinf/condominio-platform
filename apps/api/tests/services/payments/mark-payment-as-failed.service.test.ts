import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPayment } from '@packages/domain'
import { MarkPaymentAsFailedService } from '@src/services/payments'

type TMockRepository = {
  getById: (id: string) => Promise<TPayment | null>
  update: (id: string, data: unknown) => Promise<TPayment | null>
}

describe('MarkPaymentAsFailedService', function () {
  let service: MarkPaymentAsFailedService
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
    paymentMethod: 'gateway',
    paymentGatewayId: null,
    paymentDetails: null,
    paymentDate: '2025-01-01',
    registeredAt: new Date(),
    status: 'pending',
    receiptUrl: null,
    receiptNumber: null,
    notes: null,
    metadata: null,
    registeredBy: '550e8400-e29b-41d4-a716-446655440002',
    verifiedBy: null,
    verifiedAt: null,
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

    service = new MarkPaymentAsFailedService(mockRepository as never)
  })

  describe('execute', function () {
    it('should mark payment as failed successfully', async function () {
      const result = await service.execute({
        paymentId: mockPayment.id,
        failureReason: 'Gateway timeout',
        updatedByUserId: mockPayment.userId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.payment.status).toBe('failed')
        expect(result.data.message).toBe('Payment marked as failed')
      }
    })

    it('should fail when payment not found', async function () {
      mockRepository.getById = async function () {
        return null
      }

      const result = await service.execute({
        paymentId: 'non-existent',
        failureReason: 'Gateway timeout',
        updatedByUserId: mockPayment.userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when payment is not in pending status', async function () {
      mockRepository.getById = async function () {
        return { ...mockPayment, status: 'completed' }
      }

      const result = await service.execute({
        paymentId: mockPayment.id,
        failureReason: 'Gateway timeout',
        updatedByUserId: mockPayment.userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('cannot be marked as failed')
      }
    })

    it('should fail when failure reason is not provided', async function () {
      const result = await service.execute({
        paymentId: mockPayment.id,
        failureReason: '',
        updatedByUserId: mockPayment.userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Failure reason is required')
      }
    })

    it('should fail when failure reason is only whitespace', async function () {
      const result = await service.execute({
        paymentId: mockPayment.id,
        failureReason: '   ',
        updatedByUserId: mockPayment.userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Failure reason is required')
      }
    })
  })
})
