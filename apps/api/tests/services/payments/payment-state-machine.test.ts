import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPayment, TPaymentApplication, TQuota } from '@packages/domain'
import { VerifyPaymentService, RejectPaymentService, RefundPaymentService } from '@src/services/payments'

type TMockPaymentsRepository = {
  getById: (id: string) => Promise<TPayment | null>
  verifyPayment: (id: string, verifiedBy: string, notes?: string) => Promise<TPayment | null>
  rejectPayment: (id: string, rejectedBy: string, notes?: string) => Promise<TPayment | null>
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

describe('Payment State Machine', function () {
  let verifyService: VerifyPaymentService
  let rejectService: RejectPaymentService
  let refundService: RefundPaymentService
  let mockPaymentsRepository: TMockPaymentsRepository
  let mockPaymentApplicationsRepository: TMockPaymentApplicationsRepository
  let mockQuotasRepository: TMockQuotasRepository
  let mockDb: TMockDb

  const adminUserId = '550e8400-e29b-41d4-a716-446655440099'
  const userUserId = '550e8400-e29b-41d4-a716-446655440010'
  const unitId = '550e8400-e29b-41d4-a716-446655440020'
  const currencyId = '550e8400-e29b-41d4-a716-446655440050'

  // Base payment template
  const createPayment = (id: string, status: TPayment['status']): TPayment => ({
    id,
    paymentNumber: `PAY-${id.slice(-3)}`,
    userId: userUserId,
    unitId,
    amount: '150.00',
    currencyId,
    paidAmount: null,
    paidCurrencyId: null,
    exchangeRate: null,
    paymentMethod: 'transfer',
    paymentGatewayId: null,
    paymentDetails: null,
    paymentDate: '2024-01-15',
    registeredAt: new Date(),
    status,
    receiptUrl: null,
    receiptNumber: null,
    notes: null,
    metadata: null,
    registeredBy: userUserId,
    verifiedBy: null,
    verifiedAt: null,
    verificationNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Payment fixtures for different states
  const pendingPayment = createPayment('550e8400-e29b-41d4-a716-446655440001', 'pending')
  const pendingVerificationPayment = createPayment('550e8400-e29b-41d4-a716-446655440002', 'pending_verification')
  const completedPayment = createPayment('550e8400-e29b-41d4-a716-446655440003', 'completed')
  const rejectedPayment = createPayment('550e8400-e29b-41d4-a716-446655440004', 'rejected')
  const refundedPayment = createPayment('550e8400-e29b-41d4-a716-446655440005', 'refunded')
  const failedPayment = createPayment('550e8400-e29b-41d4-a716-446655440006', 'failed')

  const mockQuota: TQuota = {
    id: '550e8400-e29b-41d4-a716-446655440010',
    unitId,
    paymentConceptId: '550e8400-e29b-41d4-a716-446655440011',
    periodYear: 2025,
    periodMonth: 1,
    periodDescription: 'January 2025',
    baseAmount: '150.00',
    currencyId,
    interestAmount: '0.00',
    amountInBaseCurrency: null,
    exchangeRateUsed: null,
    issueDate: '2025-01-01',
    dueDate: '2025-01-15',
    status: 'paid',
    paidAmount: '150.00',
    balance: '0.00',
    notes: null,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockApplication: TPaymentApplication = {
    id: '550e8400-e29b-41d4-a716-446655440020',
    paymentId: completedPayment.id,
    quotaId: mockQuota.id,
    appliedAmount: '150.00',
    appliedToPrincipal: '150.00',
    appliedToInterest: '0.00',
    registeredBy: userUserId,
    appliedAt: new Date(),
  }

  beforeEach(function () {
    // Create mock payment store
    const paymentStore = new Map<string, TPayment>([
      [pendingPayment.id, pendingPayment],
      [pendingVerificationPayment.id, pendingVerificationPayment],
      [completedPayment.id, completedPayment],
      [rejectedPayment.id, rejectedPayment],
      [refundedPayment.id, refundedPayment],
      [failedPayment.id, failedPayment],
    ])

    mockPaymentsRepository = {
      getById: async function (id: string) {
        return paymentStore.get(id) ?? null
      },
      verifyPayment: async function (id: string, verifiedBy: string, notes?: string) {
        const payment = paymentStore.get(id)
        if (!payment) return null

        const verified = {
          ...payment,
          status: 'completed' as const,
          verifiedBy,
          verifiedAt: new Date(),
          verificationNotes: notes ?? null,
        }
        paymentStore.set(id, verified)
        return verified
      },
      rejectPayment: async function (id: string, rejectedBy: string, notes?: string) {
        const payment = paymentStore.get(id)
        if (!payment) return null

        const rejected = {
          ...payment,
          status: 'rejected' as const,
          verifiedBy: rejectedBy,
          verifiedAt: new Date(),
          verificationNotes: notes ?? null,
        }
        paymentStore.set(id, rejected)
        return rejected
      },
      update: async function (id: string, data: any) {
        const payment = paymentStore.get(id)
        if (!payment) return null

        const updated = { ...payment, ...data }
        paymentStore.set(id, updated)
        return updated
      },
      withTx: function (tx: any) {
        return this
      },
    }

    mockPaymentApplicationsRepository = {
      getByPaymentId: async function (paymentId: string) {
        if (paymentId === completedPayment.id) {
          return [mockApplication]
        }
        return []
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

    verifyService = new VerifyPaymentService(mockPaymentsRepository as never)
    rejectService = new RejectPaymentService(mockPaymentsRepository as never)
    refundService = new RefundPaymentService(
      mockDb as never,
      mockPaymentsRepository as never,
      mockPaymentApplicationsRepository as never,
      mockQuotasRepository as never
    )
  })

  describe('verify (pending_verification → completed)', function () {
    it('succeeds from pending_verification', async function () {
      const result = await verifyService.execute({
        paymentId: pendingVerificationPayment.id,
        verifiedByUserId: adminUserId,
        notes: 'Receipt verified',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.payment.status).toBe('completed')
        expect(result.data.payment.verifiedBy).toBe(adminUserId)
        expect(result.data.payment.verifiedAt).toBeDefined()
        expect(result.data.payment.verificationNotes).toBe('Receipt verified')
        expect(result.data.message).toBe('Payment verified successfully')
      }
    })

    it('fails from pending', async function () {
      const result = await verifyService.execute({
        paymentId: pendingPayment.id,
        verifiedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('not pending verification')
        expect(result.error).toContain('Current status: pending')
      }
    })

    it('fails from completed', async function () {
      const result = await verifyService.execute({
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

    it('fails from rejected', async function () {
      const result = await verifyService.execute({
        paymentId: rejectedPayment.id,
        verifiedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('not pending verification')
        expect(result.error).toContain('Current status: rejected')
      }
    })

    it('fails from refunded', async function () {
      const result = await verifyService.execute({
        paymentId: refundedPayment.id,
        verifiedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('not pending verification')
        expect(result.error).toContain('Current status: refunded')
      }
    })

    it('fails from failed', async function () {
      const result = await verifyService.execute({
        paymentId: failedPayment.id,
        verifiedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('not pending verification')
        expect(result.error).toContain('Current status: failed')
      }
    })

    it('returns NOT_FOUND for non-existent payment', async function () {
      const result = await verifyService.execute({
        paymentId: '550e8400-e29b-41d4-a716-446655440999',
        verifiedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Payment not found')
      }
    })

    it('stores verifiedBy user ID', async function () {
      const result = await verifyService.execute({
        paymentId: pendingVerificationPayment.id,
        verifiedByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.payment.verifiedBy).toBe(adminUserId)
      }
    })
  })

  describe('reject (pending_verification → rejected)', function () {
    it('succeeds from pending_verification', async function () {
      const result = await rejectService.execute({
        paymentId: pendingVerificationPayment.id,
        rejectedByUserId: adminUserId,
        notes: 'Invalid receipt',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.payment.status).toBe('rejected')
        expect(result.data.payment.verifiedBy).toBe(adminUserId)
        expect(result.data.payment.verifiedAt).toBeDefined()
        expect(result.data.payment.verificationNotes).toBe('Invalid receipt')
        expect(result.data.message).toBe('Payment rejected')
      }
    })

    it('fails from pending', async function () {
      const result = await rejectService.execute({
        paymentId: pendingPayment.id,
        rejectedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('not pending verification')
        expect(result.error).toContain('Current status: pending')
      }
    })

    it('fails from completed', async function () {
      const result = await rejectService.execute({
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

    it('fails from rejected', async function () {
      const result = await rejectService.execute({
        paymentId: rejectedPayment.id,
        rejectedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('not pending verification')
        expect(result.error).toContain('Current status: rejected')
      }
    })

    it('fails from refunded', async function () {
      const result = await rejectService.execute({
        paymentId: refundedPayment.id,
        rejectedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('not pending verification')
        expect(result.error).toContain('Current status: refunded')
      }
    })

    it('returns NOT_FOUND for non-existent payment', async function () {
      const result = await rejectService.execute({
        paymentId: '550e8400-e29b-41d4-a716-446655440999',
        rejectedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Payment not found')
      }
    })

    it('stores rejectedBy user ID', async function () {
      const result = await rejectService.execute({
        paymentId: pendingVerificationPayment.id,
        rejectedByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.payment.verifiedBy).toBe(adminUserId)
      }
    })
  })

  describe('refund (completed → refunded)', function () {
    it('succeeds from completed', async function () {
      const result = await refundService.execute({
        paymentId: completedPayment.id,
        refundReason: 'Customer requested refund',
        refundedByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.payment.status).toBe('refunded')
        expect(result.data.reversedApplications).toBe(1)
        expect(result.data.message).toContain('Payment refunded')
        expect(result.data.message).toContain('1 quota application(s) reversed')
      }
    })

    it('fails from pending', async function () {
      const result = await refundService.execute({
        paymentId: pendingPayment.id,
        refundReason: 'Customer requested refund',
        refundedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Only completed payments can be refunded')
        expect(result.error).toContain('Current status: pending')
      }
    })

    it('fails from pending_verification', async function () {
      const result = await refundService.execute({
        paymentId: pendingVerificationPayment.id,
        refundReason: 'Customer requested refund',
        refundedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Only completed payments can be refunded')
        expect(result.error).toContain('Current status: pending_verification')
      }
    })

    it('fails from rejected', async function () {
      const result = await refundService.execute({
        paymentId: rejectedPayment.id,
        refundReason: 'Customer requested refund',
        refundedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Only completed payments can be refunded')
        expect(result.error).toContain('Current status: rejected')
      }
    })

    it('fails from refunded', async function () {
      const result = await refundService.execute({
        paymentId: refundedPayment.id,
        refundReason: 'Customer requested refund',
        refundedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Only completed payments can be refunded')
        expect(result.error).toContain('Current status: refunded')
      }
    })

    it('fails from failed', async function () {
      const result = await refundService.execute({
        paymentId: failedPayment.id,
        refundReason: 'Customer requested refund',
        refundedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Only completed payments can be refunded')
        expect(result.error).toContain('Current status: failed')
      }
    })

    it('returns NOT_FOUND for non-existent payment', async function () {
      const result = await refundService.execute({
        paymentId: '550e8400-e29b-41d4-a716-446655440999',
        refundReason: 'Customer requested refund',
        refundedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Payment not found')
      }
    })

    it('fails without refund reason', async function () {
      const result = await refundService.execute({
        paymentId: completedPayment.id,
        refundReason: '',
        refundedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Refund reason is required')
      }
    })

    it('fails with empty refund reason', async function () {
      const result = await refundService.execute({
        paymentId: completedPayment.id,
        refundReason: '   ',
        refundedByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('Refund reason is required')
      }
    })

    it('reverses payment applications', async function () {
      let deletedApplicationId: string | null = null

      mockPaymentApplicationsRepository.hardDelete = async function (id: string) {
        deletedApplicationId = id
        return true
      }

      const result = await refundService.execute({
        paymentId: completedPayment.id,
        refundReason: 'Customer requested refund',
        refundedByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.reversedApplications).toBe(1)
        expect(deletedApplicationId!).toBe(mockApplication.id)
      }
    })
  })

  describe('State transition summary', function () {
    it('documents all valid state transitions', async function () {
      // This test serves as documentation of the valid state machine transitions
      const validTransitions = [
        { from: 'pending_verification', to: 'completed', via: 'verify' },
        { from: 'pending_verification', to: 'rejected', via: 'reject' },
        { from: 'completed', to: 'refunded', via: 'refund' },
      ]

      expect(validTransitions.length).toBe(3)
      expect(validTransitions).toContainEqual({ from: 'pending_verification', to: 'completed', via: 'verify' })
      expect(validTransitions).toContainEqual({ from: 'pending_verification', to: 'rejected', via: 'reject' })
      expect(validTransitions).toContainEqual({ from: 'completed', to: 'refunded', via: 'refund' })
    })

    it('documents all invalid state transitions', async function () {
      // This test serves as documentation of all invalid state transitions
      const invalidTransitions = [
        // verify cannot transition from:
        { from: 'pending', to: 'completed', via: 'verify' },
        { from: 'completed', to: 'completed', via: 'verify' },
        { from: 'rejected', to: 'completed', via: 'verify' },
        { from: 'refunded', to: 'completed', via: 'verify' },
        { from: 'failed', to: 'completed', via: 'verify' },
        // reject cannot transition from:
        { from: 'pending', to: 'rejected', via: 'reject' },
        { from: 'completed', to: 'rejected', via: 'reject' },
        { from: 'rejected', to: 'rejected', via: 'reject' },
        { from: 'refunded', to: 'rejected', via: 'reject' },
        // refund cannot transition from:
        { from: 'pending', to: 'refunded', via: 'refund' },
        { from: 'pending_verification', to: 'refunded', via: 'refund' },
        { from: 'rejected', to: 'refunded', via: 'refund' },
        { from: 'refunded', to: 'refunded', via: 'refund' },
        { from: 'failed', to: 'refunded', via: 'refund' },
      ]

      expect(invalidTransitions.length).toBe(14)
    })
  })
})
