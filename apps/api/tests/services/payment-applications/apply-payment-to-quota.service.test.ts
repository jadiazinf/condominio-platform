import { describe, it, expect, beforeEach } from 'bun:test'
import type {
  TPayment,
  TQuota,
  TPaymentApplication,
  TPaymentConcept,
  TQuotaAdjustment,
} from '@packages/domain'
import { ApplyPaymentToQuotaService } from '@src/services/payment-applications'

// ─────────────────────────────────────────────────────────────────────────────
// Mock repository types
// ─────────────────────────────────────────────────────────────────────────────

type TMockPaymentApplicationsRepo = {
  getByPaymentId: (id: string) => Promise<TPaymentApplication[]>
  create: (data: Record<string, unknown>) => Promise<TPaymentApplication>
  withTx: (tx: unknown) => TMockPaymentApplicationsRepo
}

type TMockPaymentsRepo = {
  getById: (id: string) => Promise<TPayment | null>
}

type TMockQuotasRepo = {
  getById: (id: string) => Promise<TQuota | null>
  getUnpaidByConceptAndUnit: (conceptId: string, unitId: string) => Promise<TQuota[]>
  update: (id: string, data: Partial<TQuota>) => Promise<TQuota | null>
  withTx: (tx: unknown) => TMockQuotasRepo
}

type TMockAdjustmentsRepo = {
  getByQuotaId: (id: string) => Promise<TQuotaAdjustment[]>
  create: (data: Record<string, unknown>) => Promise<TQuotaAdjustment>
  withTx: (tx: unknown) => TMockAdjustmentsRepo
}

type TMockInterestConfigsRepo = {
  getActiveForDate: (
    conceptId: string,
    date: string
  ) => Promise<{
    interestType: string
    interestRate: string | null
    fixedAmount: string | null
    gracePeriodDays: number | null
    calculationPeriod: string | null
  } | null>
}

type TMockPaymentConceptsRepo = {
  getById: (id: string) => Promise<TPaymentConcept | null>
}

type TMockPendingAllocationsRepo = {
  create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
  withTx: (tx: unknown) => TMockPendingAllocationsRepo
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock db
// ─────────────────────────────────────────────────────────────────────────────

const mockDb = {
  transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(mockDb),
  execute: async () => ({ rows: [{ id: 'lock' }] }),
} as never

// ─────────────────────────────────────────────────────────────────────────────
// Shared IDs
// ─────────────────────────────────────────────────────────────────────────────

const paymentId = '550e8400-e29b-41d4-a716-446655440001'
const quotaId = '550e8400-e29b-41d4-a716-446655440002'
const unitId = '550e8400-e29b-41d4-a716-446655440010'
const conceptId = '550e8400-e29b-41d4-a716-446655440020'
const currencyId = '550e8400-e29b-41d4-a716-446655440030'
const adminUserId = '550e8400-e29b-41d4-a716-446655440099'
const condominiumId = '550e8400-e29b-41d4-a716-446655440040'
const applicationId = '550e8400-e29b-41d4-a716-446655440100'

// ─────────────────────────────────────────────────────────────────────────────
// Base fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makePayment(overrides: Partial<TPayment> = {}): TPayment {
  return {
    id: paymentId,
    paymentNumber: 'PAY-001',
    userId: '550e8400-e29b-41d4-a716-446655440050',
    unitId,
    amount: '500.00',
    currencyId,
    paidAmount: null,
    paidCurrencyId: null,
    exchangeRate: null,
    paymentMethod: 'transfer',
    paymentGatewayId: null,
    paymentDetails: null,
    paymentDate: '2025-01-05',
    registeredAt: new Date(),
    status: 'completed',
    receiptUrl: null,
    receiptNumber: null,
    notes: null,
    metadata: null,
    registeredBy: '550e8400-e29b-41d4-a716-446655440050',
    verifiedBy: adminUserId,
    verifiedAt: new Date(),
    verificationNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeQuota(overrides: Partial<TQuota> = {}): TQuota {
  return {
    id: quotaId,
    unitId,
    paymentConceptId: conceptId,
    periodYear: 2025,
    periodMonth: 1,
    periodDescription: 'Enero 2025',
    baseAmount: '500.00',
    currencyId,
    interestAmount: '0',
    amountInBaseCurrency: null,
    exchangeRateUsed: null,
    issueDate: '2025-01-01',
    dueDate: '2025-01-15',
    status: 'pending',
    adjustmentsTotal: '0',
    paidAmount: '0',
    balance: '500.00',
    notes: null,
    metadata: null,
    createdBy: adminUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeConcept(overrides: Partial<TPaymentConcept> = {}): TPaymentConcept {
  return {
    id: conceptId,
    condominiumId,
    buildingId: null,
    name: 'Condominium Fee',
    description: null,
    conceptType: 'condominium_fee',
    isRecurring: true,
    recurrencePeriod: 'monthly',
    chargeGenerationStrategy: 'auto',
    currencyId,
    allowsPartialPayment: true,
    latePaymentType: 'none',
    latePaymentValue: null,
    latePaymentGraceDays: 0,
    earlyPaymentType: 'none',
    earlyPaymentValue: null,
    earlyPaymentDaysBeforeDue: 0,
    issueDay: 1,
    dueDay: 15,
    effectiveFrom: null,
    effectiveUntil: null,
    isActive: true,
    metadata: null,
    createdBy: adminUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeApplication(overrides: Partial<TPaymentApplication> = {}): TPaymentApplication {
  return {
    id: applicationId,
    paymentId,
    quotaId,
    appliedAmount: '500.00',
    appliedToPrincipal: '500.00',
    appliedToInterest: '0',
    registeredBy: adminUserId,
    appliedAt: new Date(),
    ...overrides,
  }
}

function makeAdjustment(overrides: Partial<TQuotaAdjustment> = {}): TQuotaAdjustment {
  return {
    id: '550e8400-e29b-41d4-a716-446655440200',
    quotaId,
    previousAmount: '500.00',
    newAmount: '450.00',
    adjustmentType: 'discount',
    reason: 'Test adjustment',
    tag: null,
    createdBy: adminUserId,
    createdAt: new Date(),
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ApplyPaymentToQuotaService', function () {
  let service: ApplyPaymentToQuotaService
  let mockPaymentApplicationsRepo: TMockPaymentApplicationsRepo
  let mockPaymentsRepo: TMockPaymentsRepo
  let mockQuotasRepo: TMockQuotasRepo
  let mockAdjustmentsRepo: TMockAdjustmentsRepo
  let mockInterestConfigsRepo: TMockInterestConfigsRepo
  let mockPaymentConceptsRepo: TMockPaymentConceptsRepo
  let mockPendingAllocationsRepo: TMockPendingAllocationsRepo

  // Track calls for assertions
  let createdApplications: Record<string, unknown>[]
  let createdAdjustments: Record<string, unknown>[]
  let updatedQuotas: { id: string; data: Partial<TQuota> }[]
  let createdPendingAllocations: Record<string, unknown>[]

  // Configurable fixtures per test
  let payment: TPayment
  let quota: TQuota
  let concept: TPaymentConcept | null
  let existingApplications: TPaymentApplication[]
  let existingAdjustments: TQuotaAdjustment[]
  let unpaidQuotas: TQuota[]
  let interestConfig: {
    interestType: string
    interestRate: string | null
    fixedAmount: string | null
    gracePeriodDays: number | null
    calculationPeriod: string | null
  } | null

  beforeEach(function () {
    // Reset trackers
    createdApplications = []
    createdAdjustments = []
    updatedQuotas = []
    createdPendingAllocations = []

    // Reset fixtures to defaults
    payment = makePayment()
    quota = makeQuota()
    concept = makeConcept()
    existingApplications = []
    existingAdjustments = []
    unpaidQuotas = [] // Only the current quota (no older unpaid ones)
    interestConfig = null

    mockPaymentApplicationsRepo = {
      getByPaymentId: async function () {
        return existingApplications
      },
      create: async function (data) {
        createdApplications.push(data)
        return makeApplication({
          appliedAmount: data.appliedAmount as string,
          appliedToPrincipal: data.appliedToPrincipal as string,
          appliedToInterest: data.appliedToInterest as string,
        })
      },
      withTx() {
        return this
      },
    }

    mockPaymentsRepo = {
      getById: async function () {
        return payment
      },
    }

    mockQuotasRepo = {
      getById: async function () {
        return quota
      },
      getUnpaidByConceptAndUnit: async function () {
        return unpaidQuotas
      },
      update: async function (id: string, data: Partial<TQuota>) {
        updatedQuotas.push({ id, data })
        return { ...quota, ...data }
      },
      withTx() {
        return this
      },
    }

    mockAdjustmentsRepo = {
      getByQuotaId: async function () {
        return existingAdjustments
      },
      create: async function (data) {
        createdAdjustments.push(data)
        return makeAdjustment({
          adjustmentType: data.adjustmentType as TQuotaAdjustment['adjustmentType'],
          reason: data.reason as string,
          previousAmount: data.previousAmount as string,
          newAmount: data.newAmount as string,
        })
      },
      withTx() {
        return this
      },
    }

    mockInterestConfigsRepo = {
      getActiveForDate: async function () {
        return interestConfig
      },
    }

    mockPaymentConceptsRepo = {
      getById: async function () {
        return concept
      },
    }

    mockPendingAllocationsRepo = {
      create: async function (data) {
        createdPendingAllocations.push(data)
        return { id: '550e8400-e29b-41d4-a716-446655440300', ...data }
      },
      withTx() {
        return this
      },
    }

    service = new ApplyPaymentToQuotaService(
      mockDb,
      mockPaymentApplicationsRepo as never,
      mockPaymentsRepo as never,
      mockQuotasRepo as never,
      mockAdjustmentsRepo as never,
      mockInterestConfigsRepo as never,
      mockPaymentConceptsRepo as never,
      mockPendingAllocationsRepo as never
    )
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Basic payment application
  // ─────────────────────────────────────────────────────────────────────────

  describe('basic payment application', function () {
    it('should apply a simple payment to a pending quota', async function () {
      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '500.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.application).toBeDefined()
        expect(result.data.quotaUpdated).toBe(true)
        expect(result.data.interestReversed).toBe(false)
        expect(result.data.earlyPaymentDiscountApplied).toBe(false)
        expect(result.data.latePaymentSurchargeApplied).toBe(false)
        expect(result.data.excessAmount).toBeNull()
        expect(result.data.message).toContain('fully paid')
      }

      // Verify quota was updated
      expect(updatedQuotas.length).toBeGreaterThanOrEqual(1)
      const quotaUpdate = updatedQuotas.find(u => u.data.status === 'paid')
      expect(quotaUpdate).toBeDefined()
      expect(quotaUpdate!.data.paidAmount).toBe('500.00')
      expect(quotaUpdate!.data.balance).toBe('0.00')
      expect(quotaUpdate!.data.status).toBe('paid')
    })

    it('should apply a partial payment and leave remaining balance', async function () {
      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '200.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quotaUpdated).toBe(true)
        expect(result.data.message).toContain('300.00')
      }

      const quotaUpdate = updatedQuotas.find(u => u.data.paidAmount != null)
      expect(quotaUpdate).toBeDefined()
      expect(quotaUpdate!.data.paidAmount).toBe('200.00')
      expect(quotaUpdate!.data.balance).toBe('300.00')
      expect(quotaUpdate!.data.status).toBe('partial')
    })

    it('should split payment between interest and principal', async function () {
      quota = makeQuota({ interestAmount: '50.00', balance: '550.00' })
      // Payment is late so interest is not reversed; amount covers interest + principal
      payment = makePayment({ paymentDate: '2025-01-20', amount: '550.00' })

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '550.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)

      // Payment should cover interest first, then principal
      expect(createdApplications.length).toBe(1)
      expect(createdApplications[0]!.appliedToInterest).toBe('50.00')
      expect(createdApplications[0]!.appliedToPrincipal).toBe('500.00')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Early payment discount (percentage)
  // ─────────────────────────────────────────────────────────────────────────

  describe('early payment discount (percentage)', function () {
    it('should apply percentage discount when paying before cutoff date', async function () {
      // Due date: Jan 15, earlyPaymentDaysBeforeDue: 10 -> cutoff: Jan 5
      // Payment date: Jan 3 (before cutoff)
      concept = makeConcept({
        earlyPaymentType: 'percentage',
        earlyPaymentValue: 10,
        earlyPaymentDaysBeforeDue: 10,
      })
      payment = makePayment({ paymentDate: '2025-01-03' })

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '450.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.earlyPaymentDiscountApplied).toBe(true)
        expect(result.data.latePaymentSurchargeApplied).toBe(false)
      }

      // Discount adjustment created: 10% of 500 = 50
      const discountAdj = createdAdjustments.find(a => (a.adjustmentType as string) === 'discount')
      expect(discountAdj).toBeDefined()
      expect(discountAdj!.previousAmount).toBe('500.00')
      expect(discountAdj!.newAmount).toBe('450.00')
      expect(discountAdj!.reason as string).toContain('Descuento por pronto pago:')
      expect(discountAdj!.reason as string).toContain('10%')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Early payment discount (fixed)
  // ─────────────────────────────────────────────────────────────────────────

  describe('early payment discount (fixed)', function () {
    it('should apply fixed discount when paying before cutoff date', async function () {
      concept = makeConcept({
        earlyPaymentType: 'fixed',
        earlyPaymentValue: 50,
        earlyPaymentDaysBeforeDue: 10,
      })
      payment = makePayment({ paymentDate: '2025-01-03' })

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '450.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.earlyPaymentDiscountApplied).toBe(true)
      }

      const discountAdj = createdAdjustments.find(a => (a.adjustmentType as string) === 'discount')
      expect(discountAdj).toBeDefined()
      expect(discountAdj!.previousAmount).toBe('500.00')
      expect(discountAdj!.newAmount).toBe('450.00')
      expect(discountAdj!.reason as string).toContain('Descuento por pronto pago:')
      expect(discountAdj!.reason as string).toContain('50.00')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Late payment surcharge (percentage)
  // ─────────────────────────────────────────────────────────────────────────

  describe('late payment surcharge (percentage)', function () {
    it('should apply percentage surcharge when paying after grace period', async function () {
      // Due: Jan 15, grace: 5 days -> surcharge start: Jan 20
      // Payment: Jan 25 (after surcharge start)
      concept = makeConcept({
        latePaymentType: 'percentage',
        latePaymentValue: 10,
        latePaymentGraceDays: 5,
      })
      payment = makePayment({ paymentDate: '2025-01-25', amount: '550.00' })

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '550.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.latePaymentSurchargeApplied).toBe(true)
        expect(result.data.earlyPaymentDiscountApplied).toBe(false)
      }

      // Surcharge adjustment: 10% of 500 = 50
      const surchargeAdj = createdAdjustments.find(a => (a.adjustmentType as string) === 'increase')
      expect(surchargeAdj).toBeDefined()
      expect(surchargeAdj!.previousAmount).toBe('500.00')
      expect(surchargeAdj!.newAmount).toBe('550.00')
      expect(surchargeAdj!.reason as string).toContain('Recargo por mora:')
      expect(surchargeAdj!.reason as string).toContain('10%')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Late payment surcharge (fixed)
  // ─────────────────────────────────────────────────────────────────────────

  describe('late payment surcharge (fixed)', function () {
    it('should apply fixed surcharge when paying after grace period', async function () {
      concept = makeConcept({
        latePaymentType: 'fixed',
        latePaymentValue: 25,
        latePaymentGraceDays: 5,
      })
      payment = makePayment({ paymentDate: '2025-01-25', amount: '525.00' })

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '525.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.latePaymentSurchargeApplied).toBe(true)
      }

      const surchargeAdj = createdAdjustments.find(a => (a.adjustmentType as string) === 'increase')
      expect(surchargeAdj).toBeDefined()
      expect(surchargeAdj!.previousAmount).toBe('500.00')
      expect(surchargeAdj!.newAmount).toBe('525.00')
      expect(surchargeAdj!.reason as string).toContain('Recargo por mora:')
      expect(surchargeAdj!.reason as string).toContain('25.00')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Normal period — no adjustments
  // ─────────────────────────────────────────────────────────────────────────

  describe('normal period (no adjustments)', function () {
    it('should not apply discount or surcharge when payment is between cutoff and due date', async function () {
      // Due: Jan 15, earlyPaymentDaysBeforeDue: 10 -> cutoff: Jan 5
      // Payment: Jan 10 (after cutoff, before due)
      concept = makeConcept({
        earlyPaymentType: 'percentage',
        earlyPaymentValue: 10,
        earlyPaymentDaysBeforeDue: 10,
        latePaymentType: 'percentage',
        latePaymentValue: 10,
        latePaymentGraceDays: 5,
      })
      payment = makePayment({ paymentDate: '2025-01-10' })

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '500.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.earlyPaymentDiscountApplied).toBe(false)
        expect(result.data.latePaymentSurchargeApplied).toBe(false)
      }

      // No discount or surcharge adjustments should be created
      const discountOrSurcharge = createdAdjustments.filter(
        a =>
          (a.adjustmentType as string) === 'discount' || (a.adjustmentType as string) === 'increase'
      )
      expect(discountOrSurcharge.length).toBe(0)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Payment within grace period
  // ─────────────────────────────────────────────────────────────────────────

  describe('payment within grace period', function () {
    it('should not apply surcharge when payment is after due but within grace days', async function () {
      // Due: Jan 15, grace: 5 days -> surcharge start: Jan 20
      // Payment: Jan 18 (after due, within grace)
      concept = makeConcept({
        latePaymentType: 'percentage',
        latePaymentValue: 10,
        latePaymentGraceDays: 5,
      })
      payment = makePayment({ paymentDate: '2025-01-18' })

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '500.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.latePaymentSurchargeApplied).toBe(false)
      }
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Discount not applied twice (idempotency)
  // ─────────────────────────────────────────────────────────────────────────

  describe('discount idempotency', function () {
    it('should not apply early discount if one already exists on the quota', async function () {
      concept = makeConcept({
        earlyPaymentType: 'percentage',
        earlyPaymentValue: 10,
        earlyPaymentDaysBeforeDue: 10,
      })
      payment = makePayment({ paymentDate: '2025-01-03' })
      // Pre-existing discount adjustment
      existingAdjustments = [
        makeAdjustment({
          adjustmentType: 'discount',
          reason: 'Descuento por pronto pago: 10% aplicado. Previous application.',
          tag: 'early_discount',
        }),
      ]

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '500.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.earlyPaymentDiscountApplied).toBe(false)
      }

      // No new discount adjustments
      const discountAdjs = createdAdjustments.filter(
        a => (a.adjustmentType as string) === 'discount'
      )
      expect(discountAdjs.length).toBe(0)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 9. Surcharge not applied twice (idempotency)
  // ─────────────────────────────────────────────────────────────────────────

  describe('surcharge idempotency', function () {
    it('should not apply late surcharge if one already exists on the quota', async function () {
      concept = makeConcept({
        latePaymentType: 'percentage',
        latePaymentValue: 10,
        latePaymentGraceDays: 5,
      })
      payment = makePayment({ paymentDate: '2025-01-25' })
      existingAdjustments = [
        makeAdjustment({
          adjustmentType: 'increase',
          reason: 'Recargo por mora: 10% aplicado. Previous application.',
          tag: 'late_surcharge',
        }),
      ]

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '500.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.latePaymentSurchargeApplied).toBe(false)
      }

      const surchargeAdjs = createdAdjustments.filter(
        a => (a.adjustmentType as string) === 'increase'
      )
      expect(surchargeAdjs.length).toBe(0)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 10. Interest reversal when paying on time
  // ─────────────────────────────────────────────────────────────────────────

  describe('interest reversal on time', function () {
    it('should reverse interest when payment is on or before due date', async function () {
      // Quota has interest (maybe worker ran before payment was recorded)
      quota = makeQuota({ interestAmount: '30.00', balance: '530.00' })
      payment = makePayment({ paymentDate: '2025-01-15' }) // On due date

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '500.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.interestReversed).toBe(true)
        expect(result.data.message).toContain('fully paid')
      }

      // Interest correction adjustment should exist
      const correctionAdj = createdAdjustments.find(
        a => (a.adjustmentType as string) === 'correction'
      )
      expect(correctionAdj).toBeDefined()
      expect(correctionAdj!.previousAmount).toBe('30.00')
      expect(correctionAdj!.newAmount).toBe('0.00')
      expect(correctionAdj!.reason as string).toContain('Interest reversed')

      // Quota should have interest set to 0
      const quotaUpdate = updatedQuotas.find(u => u.data.interestAmount != null)
      expect(quotaUpdate).toBeDefined()
      expect(quotaUpdate!.data.interestAmount).toBe('0.00')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 11. Interest recalculation when paying late
  // ─────────────────────────────────────────────────────────────────────────

  describe('interest recalculation late', function () {
    it('should recalculate interest to payment date when paying late and config exists', async function () {
      // Quota has interest of 100 (maybe calculated up to month end)
      // But payment came on Jan 25, so interest should be less
      quota = makeQuota({
        interestAmount: '100.00',
        balance: '600.00',
        dueDate: '2025-01-15',
      })
      payment = makePayment({ paymentDate: '2025-01-25', amount: '525.00' })

      // Interest config: simple, 1% daily after 5 grace days
      // Effective days: (25-15) - 5 = 5 days
      // Interest: 500 * 0.01 * 5 / 1 = 25.00
      interestConfig = {
        interestType: 'simple',
        interestRate: '0.01',
        fixedAmount: null,
        gracePeriodDays: 5,
        calculationPeriod: 'daily',
      }

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '525.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.interestReversed).toBe(true) // "reversed" means recalculated
      }

      // Correction adjustment should show interest reduction
      const correctionAdj = createdAdjustments.find(
        a => (a.adjustmentType as string) === 'correction'
      )
      expect(correctionAdj).toBeDefined()
      expect(correctionAdj!.previousAmount).toBe('100.00')
      expect(correctionAdj!.newAmount).toBe('25.00')
      expect(correctionAdj!.reason as string).toContain('Interest recalculated')
    })

    it('should not reduce interest if recalculated amount is higher than current', async function () {
      quota = makeQuota({
        interestAmount: '10.00',
        balance: '510.00',
        dueDate: '2025-01-15',
      })
      payment = makePayment({ paymentDate: '2025-01-25', amount: '510.00' })

      // Recalculated would be 25.00 which is > 10.00, so no reversal
      interestConfig = {
        interestType: 'simple',
        interestRate: '0.01',
        fixedAmount: null,
        gracePeriodDays: 5,
        calculationPeriod: 'daily',
      }

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '510.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.interestReversed).toBe(false)
      }
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 12. Chronological order enforcement
  // ─────────────────────────────────────────────────────────────────────────

  describe('chronological order enforcement', function () {
    it('should reject if older unpaid quotas exist for the same concept', async function () {
      const olderQuota = makeQuota({
        id: '550e8400-e29b-41d4-a716-446655440003',
        dueDate: '2024-12-15',
        periodYear: 2024,
        periodMonth: 12,
        periodDescription: 'Diciembre 2024',
        status: 'overdue',
      })
      unpaidQuotas = [olderQuota]

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '500.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('cuota(s) anteriores pendientes')
        expect(result.error).toContain('12/2024')
      }
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 13. Double-spending prevention
  // ─────────────────────────────────────────────────────────────────────────

  describe('double-spending prevention', function () {
    it('should reject when applied amount exceeds unapplied payment balance', async function () {
      // Payment is 500, already applied 400 to another quota
      existingApplications = [
        makeApplication({
          id: '550e8400-e29b-41d4-a716-446655440101',
          quotaId: '550e8400-e29b-41d4-a716-446655440009',
          appliedAmount: '400.00',
        }),
      ]

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '200.00', // Only 100 remaining
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('excede el saldo disponible')
        expect(result.error).toContain('100.00')
      }
    })

    it('should allow exact remaining balance', async function () {
      existingApplications = [
        makeApplication({
          id: '550e8400-e29b-41d4-a716-446655440101',
          quotaId: '550e8400-e29b-41d4-a716-446655440009',
          appliedAmount: '300.00',
        }),
      ]

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '200.00', // Exactly 200 remaining
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 14. Overpayment detection
  // ─────────────────────────────────────────────────────────────────────────

  describe('overpayment detection', function () {
    it('should create pending allocation for excess payment', async function () {
      // Quota: 500, paying 600
      payment = makePayment({ amount: '600.00' })

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '600.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.excessAmount).toBe('100.00')
        expect(result.data.message).toContain('Excess')
        expect(result.data.message).toContain('100.00')
      }

      // Pending allocation was created
      expect(createdPendingAllocations.length).toBe(1)
      expect(createdPendingAllocations[0]!.paymentId).toBe(paymentId)
      expect(createdPendingAllocations[0]!.pendingAmount).toBe('100.00')
      expect(createdPendingAllocations[0]!.currencyId).toBe(currencyId)
      expect(createdPendingAllocations[0]!.status).toBe('pending')
    })

    it('should not create pending allocation when payment covers exactly', async function () {
      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '500.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.excessAmount).toBeNull()
      }

      expect(createdPendingAllocations.length).toBe(0)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 15. Concept with both discount and surcharge config
  // ─────────────────────────────────────────────────────────────────────────

  describe('concept with both discount and surcharge config', function () {
    const conceptWithBoth = () =>
      makeConcept({
        earlyPaymentType: 'percentage',
        earlyPaymentValue: 10,
        earlyPaymentDaysBeforeDue: 10,
        latePaymentType: 'percentage',
        latePaymentValue: 10,
        latePaymentGraceDays: 5,
      })

    it('should only apply discount when paid early', async function () {
      concept = conceptWithBoth()
      payment = makePayment({ paymentDate: '2025-01-03' }) // Before cutoff (Jan 5)

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '450.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.earlyPaymentDiscountApplied).toBe(true)
        expect(result.data.latePaymentSurchargeApplied).toBe(false)
      }
    })

    it('should only apply surcharge when paid late (after grace)', async function () {
      concept = conceptWithBoth()
      payment = makePayment({ paymentDate: '2025-01-25', amount: '550.00' }) // After grace (Jan 20)

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '550.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.earlyPaymentDiscountApplied).toBe(false)
        expect(result.data.latePaymentSurchargeApplied).toBe(true)
      }
    })

    it('should apply neither discount nor surcharge in the normal window', async function () {
      concept = conceptWithBoth()
      payment = makePayment({ paymentDate: '2025-01-10' }) // Between cutoff and due

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '500.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.earlyPaymentDiscountApplied).toBe(false)
        expect(result.data.latePaymentSurchargeApplied).toBe(false)
      }
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Validation errors
  // ─────────────────────────────────────────────────────────────────────────

  describe('validation errors', function () {
    it('should return NOT_FOUND when payment does not exist', async function () {
      payment = null as never
      mockPaymentsRepo.getById = async () => null

      const result = await service.execute({
        paymentId: '550e8400-e29b-41d4-a716-446655440999',
        quotaId,
        appliedAmount: '500.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Payment not found')
      }
    })

    it('should return BAD_REQUEST when payment is not completed', async function () {
      payment = makePayment({ status: 'pending_verification' })

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '500.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('must be completed')
        expect(result.error).toContain('pending_verification')
      }
    })

    it('should return NOT_FOUND when quota does not exist', async function () {
      mockQuotasRepo.getById = async () => null

      const result = await service.execute({
        paymentId,
        quotaId: '550e8400-e29b-41d4-a716-446655440999',
        appliedAmount: '500.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Quota not found')
      }
    })

    it('should return BAD_REQUEST when quota is already paid', async function () {
      quota = makeQuota({ status: 'paid' })

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '500.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('already fully paid')
      }
    })

    it('should return BAD_REQUEST when quota is cancelled', async function () {
      quota = makeQuota({ status: 'cancelled' })

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '500.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('cancelled')
      }
    })

    it('should return BAD_REQUEST when quota is exonerated', async function () {
      quota = makeQuota({ status: 'exonerated' })

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '500.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('exonerated')
      }
    })

    it('should return BAD_REQUEST when applied amount is zero', async function () {
      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '0',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('positive number')
      }
    })

    it('should return BAD_REQUEST when applied amount is negative', async function () {
      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '-100.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('positive number')
      }
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Discount not applied on subsequent applications
  // ─────────────────────────────────────────────────────────────────────────

  describe('discount only on first application', function () {
    it('should not apply early discount if there are existing payment applications', async function () {
      concept = makeConcept({
        earlyPaymentType: 'percentage',
        earlyPaymentValue: 10,
        earlyPaymentDaysBeforeDue: 10,
      })
      payment = makePayment({ paymentDate: '2025-01-03' })
      // An existing application already exists (partial payment)
      existingApplications = [
        makeApplication({
          id: '550e8400-e29b-41d4-a716-446655440101',
          appliedAmount: '200.00',
        }),
      ]
      quota = makeQuota({ paidAmount: '200.00', balance: '300.00' })

      const result = await service.execute({
        paymentId,
        quotaId,
        appliedAmount: '300.00',
        registeredByUserId: adminUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.earlyPaymentDiscountApplied).toBe(false)
      }
    })
  })
})
