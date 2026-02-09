import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPayment, TPaymentApplication, TQuota } from '@packages/domain'
import { RefundPaymentService } from '@src/services/payments'

type TMockPaymentsRepository = {
  getById: (id: string) => Promise<TPayment | null>
  update: (id: string, data: unknown) => Promise<TPayment | null>
  withTx: (tx: any) => TMockPaymentsRepository
}

type TMockPaymentApplicationsRepository = {
  getByPaymentId: (paymentId: string) => Promise<TPaymentApplication[]>
  hardDelete: (id: string) => Promise<boolean>
  withTx: (tx: any) => TMockPaymentApplicationsRepository
}

type TMockQuotasRepository = {
  getById: (id: string) => Promise<TQuota | null>
  update: (id: string, data: unknown) => Promise<TQuota | null>
  withTx: (tx: any) => TMockQuotasRepository
}

type TMockDb = {
  transaction: <T>(fn: (tx: any) => Promise<T>) => Promise<T>
}

describe('RefundPaymentService', function () {
  let service: RefundPaymentService
  let mockPaymentsRepository: TMockPaymentsRepository
  let mockPaymentApplicationsRepository: TMockPaymentApplicationsRepository
  let mockQuotasRepository: TMockQuotasRepository
  let mockDb: TMockDb

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

  const mockQuota: TQuota = {
    id: '550e8400-e29b-41d4-a716-446655440010',
    unitId: '550e8400-e29b-41d4-a716-446655440003',
    paymentConceptId: '550e8400-e29b-41d4-a716-446655440011',
    periodYear: 2025,
    periodMonth: 1,
    periodDescription: 'January 2025',
    baseAmount: '100.00',
    currencyId: '550e8400-e29b-41d4-a716-446655440004',
    interestAmount: '0.00',
    amountInBaseCurrency: null,
    exchangeRateUsed: null,
    issueDate: '2025-01-01',
    dueDate: '2025-01-15',
    status: 'paid',
    paidAmount: '100.00',
    balance: '0.00',
    notes: null,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockApplication: TPaymentApplication = {
    id: '550e8400-e29b-41d4-a716-446655440020',
    paymentId: mockPayment.id,
    quotaId: mockQuota.id,
    appliedAmount: '100.00',
    appliedToPrincipal: '100.00',
    appliedToInterest: '0.00',
    registeredBy: mockPayment.registeredBy,
    appliedAt: new Date(),
  }

  beforeEach(function () {
    mockPaymentsRepository = {
      getById: async function () {
        return mockPayment
      },
      update: async function (id, data: any) {
        return { ...mockPayment, ...data }
      },
      withTx: function (tx: any) {
        return this
      },
    }

    mockPaymentApplicationsRepository = {
      getByPaymentId: async function () {
        return [mockApplication]
      },
      hardDelete: async function () {
        return true
      },
      withTx: function (tx: any) {
        return this
      },
    }

    mockQuotasRepository = {
      getById: async function () {
        return mockQuota
      },
      update: async function (id, data: any) {
        return { ...mockQuota, ...data }
      },
      withTx: function (tx: any) {
        return this
      },
    }

    mockDb = {
      transaction: async function <T>(fn: (tx: any) => Promise<T>) {
        return await fn(mockDb)
      },
    }

    service = new RefundPaymentService(
      mockDb as never,
      mockPaymentsRepository as never,
      mockPaymentApplicationsRepository as never,
      mockQuotasRepository as never
    )
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
        expect(result.data.reversedApplications).toBe(1)
        expect(result.data.message).toContain('Payment refunded')
      }
    })

    it('should fail when payment not found', async function () {
      mockPaymentsRepository.getById = async function () {
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
      mockPaymentsRepository.getById = async function () {
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
