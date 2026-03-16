import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPayment, TPaymentApplication, TQuota, TQuotaAdjustment } from '@packages/domain'
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

type TMockQuotaAdjustmentsRepository = {
  getByQuotaId: (quotaId: string) => Promise<TQuotaAdjustment[]>
  create: (data: any) => Promise<TQuotaAdjustment>
  withTx: (tx: any) => TMockQuotaAdjustmentsRepository
}

type TMockDb = {
  transaction: <T>(fn: (tx: any) => Promise<T>) => Promise<T>
}

describe('RefundPaymentService', function () {
  let service: RefundPaymentService
  let mockPaymentsRepository: TMockPaymentsRepository
  let mockPaymentApplicationsRepository: TMockPaymentApplicationsRepository
  let mockQuotasRepository: TMockQuotasRepository
  let mockQuotaAdjustmentsRepository: TMockQuotaAdjustmentsRepository
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
    adjustmentsTotal: '0',
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
      withTx: function (_tx: any) {
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
      withTx: function (_tx: any) {
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
      withTx: function (_tx: any) {
        return this
      },
    }

    mockQuotaAdjustmentsRepository = {
      getByQuotaId: async function () {
        return []
      },
      create: async function (data: any) {
        return { id: crypto.randomUUID(), ...data, createdAt: new Date() }
      },
      withTx: function () {
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
      mockQuotasRepository as never,
      mockQuotaAdjustmentsRepository as never
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

    it('should reverse early_discount adjustment and restore adjustmentsTotal on refund', async function () {
      // Quota had early discount applied: baseAmount=100 (immutable), adjustmentsTotal=-10
      mockQuotasRepository.getById = async function () {
        return { ...mockQuota, adjustmentsTotal: '-10.00', paidAmount: '90.00', balance: '0.00' }
      }
      mockPaymentApplicationsRepository.getByPaymentId = async function () {
        return [{ ...mockApplication, appliedAmount: '90.00', appliedToPrincipal: '90.00' }]
      }
      mockQuotaAdjustmentsRepository.getByQuotaId = async function () {
        return [
          {
            id: 'adj-1',
            quotaId: mockQuota.id,
            previousAmount: '100.00',
            newAmount: '90.00',
            adjustmentType: 'discount' as const,
            reason: 'Descuento por pronto pago',
            tag: 'early_discount',
            createdBy: mockPayment.verifiedBy!,
            createdAt: new Date(),
          },
        ]
      }

      let updatedQuota: any = null
      mockQuotasRepository.update = async function (_id: string, data: any) {
        updatedQuota = data
        return { ...mockQuota, ...data }
      }

      let createdAdjustment: any = null
      mockQuotaAdjustmentsRepository.create = async function (data: any) {
        createdAdjustment = data
        return { id: 'adj-rev-1', ...data, createdAt: new Date() }
      }

      const result = await service.execute({
        paymentId: mockPayment.id,
        refundReason: 'Customer requested refund',
        refundedByUserId: mockPayment.verifiedBy!,
      })

      expect(result.success).toBe(true)
      // adjustmentsTotal should be restored to 0 (discount reversed)
      expect(updatedQuota.adjustmentsTotal).toBe('0.00')
      // Balance should be recalculated with effective amount = 100 + 0 = 100
      expect(updatedQuota.balance).toBe('100.00')
      expect(updatedQuota.paidAmount).toBe('0.00')
      // Reversal adjustment should be created
      expect(createdAdjustment).not.toBeNull()
      expect(createdAdjustment.tag).toBe('reversal_early_discount')
      expect(createdAdjustment.adjustmentType).toBe('increase')
      expect(createdAdjustment.previousAmount).toBe('90.00')
      expect(createdAdjustment.newAmount).toBe('100.00')
    })

    it('should reverse late_surcharge adjustment and restore adjustmentsTotal on refund', async function () {
      // Quota had late surcharge: baseAmount=100 (immutable), adjustmentsTotal=10
      mockQuotasRepository.getById = async function () {
        return { ...mockQuota, adjustmentsTotal: '10.00', paidAmount: '110.00', balance: '0.00' }
      }
      mockPaymentApplicationsRepository.getByPaymentId = async function () {
        return [{ ...mockApplication, appliedAmount: '110.00', appliedToPrincipal: '110.00' }]
      }
      mockQuotaAdjustmentsRepository.getByQuotaId = async function () {
        return [
          {
            id: 'adj-2',
            quotaId: mockQuota.id,
            previousAmount: '100.00',
            newAmount: '110.00',
            adjustmentType: 'increase' as const,
            reason: 'Recargo por mora',
            tag: 'late_surcharge',
            createdBy: mockPayment.verifiedBy!,
            createdAt: new Date(),
          },
        ]
      }

      let updatedQuota: any = null
      mockQuotasRepository.update = async function (_id: string, data: any) {
        updatedQuota = data
        return { ...mockQuota, ...data }
      }

      let createdAdjustment: any = null
      mockQuotaAdjustmentsRepository.create = async function (data: any) {
        createdAdjustment = data
        return { id: 'adj-rev-2', ...data, createdAt: new Date() }
      }

      const result = await service.execute({
        paymentId: mockPayment.id,
        refundReason: 'Refund requested',
        refundedByUserId: mockPayment.verifiedBy!,
      })

      expect(result.success).toBe(true)
      expect(updatedQuota.adjustmentsTotal).toBe('0.00')
      expect(createdAdjustment.tag).toBe('reversal_late_surcharge')
      expect(createdAdjustment.adjustmentType).toBe('discount')
    })

    it('should not reverse adjustments with other tags', async function () {
      mockQuotaAdjustmentsRepository.getByQuotaId = async function () {
        return [
          {
            id: 'adj-3',
            quotaId: mockQuota.id,
            previousAmount: '100.00',
            newAmount: '80.00',
            adjustmentType: 'discount' as const,
            reason: 'Manual correction',
            tag: 'manual_correction',
            createdBy: mockPayment.verifiedBy!,
            createdAt: new Date(),
          },
        ]
      }

      let adjustmentCreated = false
      mockQuotaAdjustmentsRepository.create = async function (data: any) {
        adjustmentCreated = true
        return { id: 'adj-rev-3', ...data, createdAt: new Date() }
      }

      const result = await service.execute({
        paymentId: mockPayment.id,
        refundReason: 'Refund',
        refundedByUserId: mockPayment.verifiedBy!,
      })

      expect(result.success).toBe(true)
      expect(adjustmentCreated).toBe(false)
    })

    it('should handle refund when no adjustments exist', async function () {
      mockQuotaAdjustmentsRepository.getByQuotaId = async function () {
        return []
      }

      let updatedQuota: any = null
      mockQuotasRepository.update = async function (_id: string, data: any) {
        updatedQuota = data
        return { ...mockQuota, ...data }
      }

      const result = await service.execute({
        paymentId: mockPayment.id,
        refundReason: 'Refund',
        refundedByUserId: mockPayment.verifiedBy!,
      })

      expect(result.success).toBe(true)
      // adjustmentsTotal should NOT be changed (no adjustments to reverse)
      expect(updatedQuota.adjustmentsTotal).toBeUndefined()
      expect(updatedQuota.paidAmount).toBe('0.00')
    })

    it('should not create duplicate reversals if reversal already exists', async function () {
      mockQuotaAdjustmentsRepository.getByQuotaId = async function () {
        return [
          {
            id: 'adj-1',
            quotaId: mockQuota.id,
            previousAmount: '100.00',
            newAmount: '90.00',
            adjustmentType: 'discount' as const,
            reason: 'Descuento',
            tag: 'early_discount',
            createdBy: mockPayment.verifiedBy!,
            createdAt: new Date(),
          },
          {
            id: 'adj-rev-1',
            quotaId: mockQuota.id,
            previousAmount: '90.00',
            newAmount: '100.00',
            adjustmentType: 'increase' as const,
            reason: 'Reversal',
            tag: 'reversal_early_discount',
            createdBy: mockPayment.verifiedBy!,
            createdAt: new Date(),
          },
        ]
      }

      let adjustmentCreated = false
      mockQuotaAdjustmentsRepository.create = async function (data: any) {
        adjustmentCreated = true
        return { id: 'new', ...data, createdAt: new Date() }
      }

      await service.execute({
        paymentId: mockPayment.id,
        refundReason: 'Refund',
        refundedByUserId: mockPayment.verifiedBy!,
      })

      expect(adjustmentCreated).toBe(false)
    })

    it('should recalculate balance correctly with restored adjustmentsTotal and interest', async function () {
      // baseAmount=100 (immutable), adjustmentsTotal=-10, effective=90
      mockQuotasRepository.getById = async function () {
        return {
          ...mockQuota,
          adjustmentsTotal: '-10.00',
          interestAmount: '5.00',
          paidAmount: '95.00',
          balance: '0.00',
        }
      }
      mockPaymentApplicationsRepository.getByPaymentId = async function () {
        return [
          {
            ...mockApplication,
            appliedAmount: '95.00',
            appliedToPrincipal: '90.00',
            appliedToInterest: '5.00',
          },
        ]
      }
      mockQuotaAdjustmentsRepository.getByQuotaId = async function () {
        return [
          {
            id: 'adj-1',
            quotaId: mockQuota.id,
            previousAmount: '100.00',
            newAmount: '90.00',
            adjustmentType: 'discount' as const,
            reason: 'Descuento',
            tag: 'early_discount',
            createdBy: mockPayment.verifiedBy!,
            createdAt: new Date(),
          },
        ]
      }

      let updatedQuota: any = null
      mockQuotasRepository.update = async function (_id: string, data: any) {
        updatedQuota = data
        return { ...mockQuota, ...data }
      }

      await service.execute({
        paymentId: mockPayment.id,
        refundReason: 'Refund',
        refundedByUserId: mockPayment.verifiedBy!,
      })

      expect(updatedQuota.adjustmentsTotal).toBe('0.00')
      // balance = (baseAmount + adjustmentsTotal) + interest - paid = (100 + 0) + 5 - 0 = 105
      expect(updatedQuota.balance).toBe('105.00')
      expect(updatedQuota.paidAmount).toBe('0.00')
    })
  })
})
