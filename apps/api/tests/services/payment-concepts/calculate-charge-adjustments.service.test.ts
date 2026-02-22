import { describe, it, expect } from 'bun:test'
import { CalculateChargeAdjustmentsService } from '@src/services/payment-concepts/calculate-charge-adjustments.service'
import type { TPaymentConcept } from '@packages/domain'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function mockConcept(overrides: Partial<TPaymentConcept> = {}): TPaymentConcept {
  return {
    id: '550e8400-e29b-41d4-a716-446655440010',
    condominiumId: '550e8400-e29b-41d4-a716-446655440001',
    buildingId: null,
    name: 'Test Concept',
    description: null,
    conceptType: 'maintenance',
    isRecurring: true,
    recurrencePeriod: 'monthly',
    currencyId: '550e8400-e29b-41d4-a716-446655440002',
    allowsPartialPayment: true,
    latePaymentType: 'none',
    latePaymentValue: null,
    latePaymentGraceDays: 0,
    earlyPaymentType: 'none',
    earlyPaymentValue: null,
    earlyPaymentDaysBeforeDue: 0,
    issueDay: 1,
    dueDay: 15,
    isActive: true,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

type TQuotaInfo = {
  baseAmount: number
  balance: number
  dueDate: Date
}

function mockQuota(overrides: Partial<TQuotaInfo> = {}): TQuotaInfo {
  return {
    baseAmount: 100,
    balance: 100,
    dueDate: new Date('2026-02-15'),
    ...overrides,
  }
}

describe('CalculateChargeAdjustmentsService', function () {
  const service = new CalculateChargeAdjustmentsService()

  // ─────────────────────────────────────────────────────────────────────────
  // Late Fee Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('calculateLateFee', function () {
    it('should return 0 when latePaymentType is none', function () {
      const concept = mockConcept({ latePaymentType: 'none' })
      const quota = mockQuota()
      const paymentDate = new Date('2026-03-01') // well past due

      const result = service.calculateLateFee(concept, quota, paymentDate)

      expect(result).toBe(0)
    })

    it('should return 0 when payment is within grace period', function () {
      const concept = mockConcept({
        latePaymentType: 'percentage',
        latePaymentValue: 10,
        latePaymentGraceDays: 5,
      })
      const quota = mockQuota({ dueDate: new Date('2026-02-15') })
      const paymentDate = new Date('2026-02-18') // 3 days after due, within 5 day grace

      const result = service.calculateLateFee(concept, quota, paymentDate)

      expect(result).toBe(0)
    })

    it('should calculate percentage surcharge after grace period', function () {
      const concept = mockConcept({
        latePaymentType: 'percentage',
        latePaymentValue: 10,
        latePaymentGraceDays: 5,
      })
      const quota = mockQuota({ balance: 100, dueDate: new Date('2026-02-15') })
      const paymentDate = new Date('2026-02-25') // 10 days after due, past 5 day grace

      const result = service.calculateLateFee(concept, quota, paymentDate)

      expect(result).toBe(10) // 10% of 100
    })

    it('should calculate fixed surcharge after due date with grace=0', function () {
      const concept = mockConcept({
        latePaymentType: 'fixed',
        latePaymentValue: 50,
        latePaymentGraceDays: 0,
      })
      const quota = mockQuota({ dueDate: new Date('2026-02-15') })
      const paymentDate = new Date('2026-02-16') // 1 day after due

      const result = service.calculateLateFee(concept, quota, paymentDate)

      expect(result).toBe(50)
    })

    it('should apply late fee to remaining balance, not original amount', function () {
      const concept = mockConcept({
        latePaymentType: 'percentage',
        latePaymentValue: 10,
        latePaymentGraceDays: 0,
      })
      const quota = mockQuota({
        baseAmount: 100,
        balance: 60, // partially paid
        dueDate: new Date('2026-02-15'),
      })
      const paymentDate = new Date('2026-02-20')

      const result = service.calculateLateFee(concept, quota, paymentDate)

      expect(result).toBe(6) // 10% of 60 (remaining balance)
    })

    it('should apply surcharge immediately when grace period is 0', function () {
      const concept = mockConcept({
        latePaymentType: 'fixed',
        latePaymentValue: 25,
        latePaymentGraceDays: 0,
      })
      const quota = mockQuota({ dueDate: new Date('2026-02-15') })
      const paymentDate = new Date('2026-02-16') // exactly 1 day after

      const result = service.calculateLateFee(concept, quota, paymentDate)

      expect(result).toBe(25)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Early Payment Discount Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('calculateEarlyDiscount', function () {
    it('should return 0 when earlyPaymentType is none', function () {
      const concept = mockConcept({ earlyPaymentType: 'none' })
      const quota = mockQuota()
      const paymentDate = new Date('2026-02-01') // well before due

      const result = service.calculateEarlyDiscount(concept, quota, paymentDate)

      expect(result).toBe(0)
    })

    it('should calculate percentage discount when paid within window', function () {
      const concept = mockConcept({
        earlyPaymentType: 'percentage',
        earlyPaymentValue: 5,
        earlyPaymentDaysBeforeDue: 10,
      })
      const quota = mockQuota({ balance: 100, dueDate: new Date('2026-02-15') })
      const paymentDate = new Date('2026-02-01') // 14 days before due, within 10 day window

      const result = service.calculateEarlyDiscount(concept, quota, paymentDate)

      expect(result).toBe(5) // 5% of 100
    })

    it('should return 0 when payment is too late for early discount', function () {
      const concept = mockConcept({
        earlyPaymentType: 'percentage',
        earlyPaymentValue: 5,
        earlyPaymentDaysBeforeDue: 10,
      })
      const quota = mockQuota({ dueDate: new Date('2026-02-15') })
      const paymentDate = new Date('2026-02-10') // only 5 days before due, cutoff is 10

      const result = service.calculateEarlyDiscount(concept, quota, paymentDate)

      expect(result).toBe(0)
    })

    it('should calculate fixed discount when paid within window', function () {
      const concept = mockConcept({
        earlyPaymentType: 'fixed',
        earlyPaymentValue: 20,
        earlyPaymentDaysBeforeDue: 10,
      })
      const quota = mockQuota({ balance: 100, dueDate: new Date('2026-02-15') })
      const paymentDate = new Date('2026-02-01') // within window

      const result = service.calculateEarlyDiscount(concept, quota, paymentDate)

      expect(result).toBe(20)
    })

    it('should cap fixed discount at remaining balance', function () {
      const concept = mockConcept({
        earlyPaymentType: 'fixed',
        earlyPaymentValue: 80,
        earlyPaymentDaysBeforeDue: 10,
      })
      const quota = mockQuota({
        baseAmount: 100,
        balance: 30, // partially paid
        dueDate: new Date('2026-02-15'),
      })
      const paymentDate = new Date('2026-02-01')

      const result = service.calculateEarlyDiscount(concept, quota, paymentDate)

      expect(result).toBe(30) // capped at balance, not 80
    })

    it('should apply discount on exact cutoff date (inclusive)', function () {
      const concept = mockConcept({
        earlyPaymentType: 'percentage',
        earlyPaymentValue: 5,
        earlyPaymentDaysBeforeDue: 10,
      })
      const quota = mockQuota({ balance: 100, dueDate: new Date('2026-02-15') })
      const paymentDate = new Date('2026-02-05') // exactly 10 days before (inclusive)

      const result = service.calculateEarlyDiscount(concept, quota, paymentDate)

      expect(result).toBe(5) // 5% of 100
    })
  })
})
