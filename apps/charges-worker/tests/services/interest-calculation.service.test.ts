/**
 * Interest Calculation Service - Unit Tests
 *
 * Test coverage:
 * - Simple interest calculation (correct formula)
 * - Compound interest calculation
 * - Fixed amount per overdue period
 * - Grace period: within grace -> no interest
 * - Grace period: past grace -> interest from day after grace
 * - Zero rate -> no interest
 * - Zero/negative balance -> no interest
 * - Already calculated interest -> only incremental applied
 * - Interest never decreases (idempotent recalculation)
 * - Partial payment -> interest on remaining balance
 * - Config priority: concept > building > condominium
 * - Invalid/missing config values -> no interest
 * - per_overdue_quota: simple, compound, fixed_amount (once, not scaled by days)
 * - Effective date filtering in findApplicableConfig
 * - Calculation periods: daily, weekly, biweekly, quarterly, semi_annual, annual
 */
import { describe, it, expect } from 'bun:test'
import { InterestCalculationService } from '../../src/services/interest-calculation.service'
import type { TInterestConfiguration, TQuota } from '@packages/domain'

function makeQuota(overrides: Partial<TQuota> = {}): TQuota {
  return {
    id: 'quota-1',
    unitId: 'unit-1',
    paymentConceptId: 'concept-1',
    periodYear: 2025,
    periodMonth: 6,
    periodDescription: 'June 2025',
    baseAmount: '1000.00',
    currencyId: 'currency-1',
    interestAmount: '0',
    amountInBaseCurrency: null,
    exchangeRateUsed: null,
    issueDate: '2025-06-01',
    dueDate: '2025-06-15',
    status: 'overdue',
    adjustmentsTotal: '0',
    paidAmount: '0',
    balance: '1000.00',
    notes: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    ...overrides,
  }
}

function makeConfig(overrides: Partial<TInterestConfiguration> = {}): TInterestConfiguration {
  return {
    id: 'config-1',
    condominiumId: 'condo-1',
    buildingId: null,
    paymentConceptId: null,
    name: 'Default Interest',
    description: null,
    interestType: 'simple',
    interestRate: '0.05',
    fixedAmount: null,
    calculationPeriod: 'monthly',
    gracePeriodDays: 0,
    currencyId: 'currency-1',
    isActive: true,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    metadata: null,
    createdBy: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('InterestCalculationService', () => {
  const service = new InterestCalculationService()

  describe('Simple interest', () => {
    it('calculates simple interest correctly: balance * rate * days / daysInPeriod', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({
        interestType: 'simple',
        interestRate: '0.05',
        calculationPeriod: 'monthly',
      })
      // 30 days overdue, rate 5%, monthly period (30 days)
      // 1000 * 0.05 * 30 / 30 = 50.00
      const today = new Date('2025-07-15')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('50.00')
      expect(result!.calculatedInterest).toBe(50.0)
    })

    it('calculates proportional interest for partial period', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({
        interestType: 'simple',
        interestRate: '0.05',
        calculationPeriod: 'monthly',
      })
      // 10 days overdue: 1000 * 0.05 * 10 / 30 = 16.67
      const today = new Date('2025-06-25')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('16.67')
    })
  })

  describe('Compound interest', () => {
    it('calculates compound interest correctly', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({
        interestType: 'compound',
        interestRate: '0.05',
        calculationPeriod: 'monthly',
      })
      // 30 days overdue = 1 period: 1000 * ((1 + 0.05)^1 - 1) = 50.00
      const today = new Date('2025-07-15')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('50.00')
    })

    it('compounds over multiple periods', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({
        interestType: 'compound',
        interestRate: '0.05',
        calculationPeriod: 'monthly',
      })
      // 60 days overdue = 2 periods: 1000 * ((1 + 0.05)^2 - 1) = 102.50
      const today = new Date('2025-08-14')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(parseFloat(result!.newInterest)).toBeCloseTo(102.5, 1)
    })
  })

  describe('Fixed amount', () => {
    it('applies fixed amount per overdue period', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({
        interestType: 'fixed_amount',
        fixedAmount: '25.00',
        calculationPeriod: 'monthly',
      })
      // 60 days overdue = 2 full periods: 25 * 2 = 50.00
      const today = new Date('2025-08-14')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('50.00')
    })

    it('does not apply for partial period (less than one full period)', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({
        interestType: 'fixed_amount',
        fixedAmount: '25.00',
        calculationPeriod: 'monthly',
      })
      // 10 days overdue = 0 full periods
      const today = new Date('2025-06-25')

      const result = service.calculate(quota, config, today)

      expect(result).toBeNull()
    })
  })

  describe('Grace period', () => {
    it('does not apply interest within grace period', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({ gracePeriodDays: 5 })
      // 3 days overdue, grace period is 5 days
      const today = new Date('2025-06-18')

      const result = service.calculate(quota, config, today)

      expect(result).toBeNull()
    })

    it('applies interest after grace period expires', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({
        interestType: 'simple',
        interestRate: '0.05',
        calculationPeriod: 'monthly',
        gracePeriodDays: 5,
      })
      // 10 days overdue, 5 grace days, effective = 5 days
      // 1000 * 0.05 * 5 / 30 = 8.33
      const today = new Date('2025-06-25')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('8.33')
      expect(result!.daysOverdue).toBe(5)
    })
  })

  describe('Edge cases', () => {
    it('returns null for zero rate', () => {
      const quota = makeQuota({ balance: '1000.00', dueDate: '2025-06-15' })
      const config = makeConfig({ interestRate: '0' })
      const today = new Date('2025-07-15')

      const result = service.calculate(quota, config, today)

      expect(result).toBeNull()
    })

    it('returns null for zero balance', () => {
      const quota = makeQuota({ balance: '0', dueDate: '2025-06-15' })
      const config = makeConfig()
      const today = new Date('2025-07-15')

      const result = service.calculate(quota, config, today)

      expect(result).toBeNull()
    })

    it('returns null for negative balance', () => {
      const quota = makeQuota({ balance: '-50.00', dueDate: '2025-06-15' })
      const config = makeConfig()
      const today = new Date('2025-07-15')

      const result = service.calculate(quota, config, today)

      expect(result).toBeNull()
    })

    it('only applies incremental interest when previous interest exists', () => {
      const quota = makeQuota({
        dueDate: '2025-06-15',
        balance: '1000.00',
        interestAmount: '30.00',
      })
      const config = makeConfig({
        interestType: 'simple',
        interestRate: '0.05',
        calculationPeriod: 'monthly',
      })
      // 30 days overdue: total interest = 50.00
      // Previous interest = 30.00, so incremental = 20.00
      const today = new Date('2025-07-15')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('50.00')
      expect(result!.calculatedInterest).toBe(20.0) // incremental only
    })

    it('returns null when calculated interest is less than already applied', () => {
      const quota = makeQuota({
        dueDate: '2025-06-15',
        balance: '1000.00',
        interestAmount: '100.00', // More than what would be calculated
      })
      const config = makeConfig({
        interestType: 'simple',
        interestRate: '0.05',
        calculationPeriod: 'monthly',
      })
      // 30 days: total = 50.00, but already applied 100.00
      const today = new Date('2025-07-15')

      const result = service.calculate(quota, config, today)

      expect(result).toBeNull()
    })

    it('calculates interest on outstanding principal (partial payment)', () => {
      const quota = makeQuota({
        dueDate: '2025-06-15',
        baseAmount: '1000.00',
        paidAmount: '400.00',
        balance: '600.00', // Partial payment made
      })
      const config = makeConfig({
        interestType: 'simple',
        interestRate: '0.05',
        calculationPeriod: 'monthly',
      })
      // 30 days overdue, outstanding principal = 1000 - 400 = 600
      // 600 * 0.05 * 30 / 30 = 30.00
      const today = new Date('2025-07-15')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('30.00')
    })

    it('does NOT double-compound: simple interest ignores previously accrued interest', () => {
      // Quota with existing interest already in balance
      // balance = effectiveAmount + interestAmount - paidAmount = 1000 + 50 - 0 = 1050
      // BUG (old): would calculate 1050 * 0.05 * 60/30 = 105.00
      // CORRECT: outstandingPrincipal = 1000 - 0 = 1000 → 1000 * 0.05 * 60/30 = 100.00
      const quota = makeQuota({
        dueDate: '2025-06-15',
        baseAmount: '1000.00',
        interestAmount: '50.00',
        paidAmount: '0',
        balance: '1050.00',
      })
      const config = makeConfig({
        interestType: 'simple',
        interestRate: '0.05',
        calculationPeriod: 'monthly',
      })
      const today = new Date('2025-08-14') // 60 days overdue

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('100.00')
      // Incremental = 100 - 50 (previous) = 50
      expect(result!.calculatedInterest).toBe(50.0)
    })

    it('does NOT double-compound: compound interest ignores previously accrued interest', () => {
      // Quota with existing interest already in balance
      // balance = 1000 + 50 - 0 = 1050
      // BUG (old): 1050 * ((1.05)^2 - 1) = 1050 * 0.1025 = 107.63
      // CORRECT: outstandingPrincipal = 1000 → 1000 * ((1.05)^2 - 1) = 102.50
      const quota = makeQuota({
        dueDate: '2025-06-15',
        baseAmount: '1000.00',
        interestAmount: '50.00',
        paidAmount: '0',
        balance: '1050.00',
      })
      const config = makeConfig({
        interestType: 'compound',
        interestRate: '0.05',
        calculationPeriod: 'monthly',
      })
      const today = new Date('2025-08-14') // 60 days overdue

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(parseFloat(result!.newInterest)).toBeCloseTo(102.5, 1)
      // Incremental = 102.50 - 50 = 52.50
      expect(result!.calculatedInterest).toBeCloseTo(52.5, 1)
    })

    it('calculates interest on outstanding principal with adjustments', () => {
      // baseAmount=1000, adjustmentsTotal=-100 (discount), effectiveAmount=900
      // paidAmount=200, outstandingPrincipal = 900 - 200 = 700
      const quota = makeQuota({
        dueDate: '2025-06-15',
        baseAmount: '1000.00',
        adjustmentsTotal: '-100.00',
        paidAmount: '200.00',
        balance: '700.00',
      })
      const config = makeConfig({
        interestType: 'simple',
        interestRate: '0.05',
        calculationPeriod: 'monthly',
      })
      // 30 days: 700 * 0.05 * 30/30 = 35.00
      const today = new Date('2025-07-15')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('35.00')
    })
  })

  describe('Config priority (findApplicableConfig)', () => {
    it('prefers concept-level config over building and condominium', () => {
      const configs: TInterestConfiguration[] = [
        makeConfig({ id: 'condo-level', paymentConceptId: null, buildingId: null }),
        makeConfig({ id: 'building-level', paymentConceptId: null, buildingId: 'building-1' }),
        makeConfig({ id: 'concept-level', paymentConceptId: 'concept-1' }),
      ]

      const result = service.findApplicableConfig(configs, 'concept-1', 'building-1')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('concept-level')
    })

    it('falls back to building-level when no concept config', () => {
      const configs: TInterestConfiguration[] = [
        makeConfig({ id: 'condo-level', paymentConceptId: null, buildingId: null }),
        makeConfig({ id: 'building-level', paymentConceptId: null, buildingId: 'building-1' }),
      ]

      const result = service.findApplicableConfig(configs, 'concept-1', 'building-1')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('building-level')
    })

    it('falls back to condominium-level when no concept or building config', () => {
      const configs: TInterestConfiguration[] = [
        makeConfig({ id: 'condo-level', paymentConceptId: null, buildingId: null }),
      ]

      const result = service.findApplicableConfig(configs, 'concept-1', 'building-1')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('condo-level')
    })

    it('returns null when no configs available', () => {
      const result = service.findApplicableConfig([], 'concept-1', 'building-1')
      expect(result).toBeNull()
    })
  })

  describe('per_overdue_quota calculation period', () => {
    it('simple interest: applies principal * rate once, regardless of days overdue', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({
        interestType: 'simple',
        interestRate: '0.05',
        calculationPeriod: 'per_overdue_quota',
      })
      // With per_overdue_quota: outstandingPrincipal(1000) * 0.05 = 50.00 (regardless of days)
      const today10days = new Date('2025-06-25')
      const today60days = new Date('2025-08-14')

      const result10 = service.calculate(quota, config, today10days)
      const result60 = service.calculate(quota, config, today60days)

      expect(result10).not.toBeNull()
      expect(result10!.newInterest).toBe('50.00')
      expect(result60).not.toBeNull()
      expect(result60!.newInterest).toBe('50.00')
    })

    it('compound interest: applies principal * rate once with per_overdue_quota', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({
        interestType: 'compound',
        interestRate: '0.10',
        calculationPeriod: 'per_overdue_quota',
      })
      // outstandingPrincipal(1000) * 0.10 = 100.00
      const today = new Date('2025-08-14')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('100.00')
    })

    it('fixed_amount: applies fixed amount exactly once with per_overdue_quota', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({
        interestType: 'fixed_amount',
        fixedAmount: '75.00',
        calculationPeriod: 'per_overdue_quota',
      })
      // Fixed 75.00, applied once regardless of days
      const today10days = new Date('2025-06-25')
      const today90days = new Date('2025-09-13')

      const result10 = service.calculate(quota, config, today10days)
      const result90 = service.calculate(quota, config, today90days)

      expect(result10).not.toBeNull()
      expect(result10!.newInterest).toBe('75.00')
      expect(result90).not.toBeNull()
      expect(result90!.newInterest).toBe('75.00')
    })

    it('per_overdue_quota respects grace period', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({
        interestType: 'simple',
        interestRate: '0.05',
        calculationPeriod: 'per_overdue_quota',
        gracePeriodDays: 5,
      })
      // Within grace (3 days overdue, 5 grace days)
      const withinGrace = new Date('2025-06-18')
      expect(service.calculate(quota, config, withinGrace)).toBeNull()

      // After grace (10 days overdue, 5 grace days)
      const afterGrace = new Date('2025-06-25')
      const result = service.calculate(quota, config, afterGrace)
      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('50.00')
    })
  })

  describe('Effective date filtering in findApplicableConfig', () => {
    it('excludes configs not yet effective (effectiveFrom in future)', () => {
      const configs: TInterestConfiguration[] = [
        makeConfig({
          id: 'future-config',
          paymentConceptId: null,
          buildingId: null,
          effectiveFrom: '2026-01-01',
          effectiveTo: null,
        }),
      ]
      const asOfDate = new Date('2025-07-15')

      const result = service.findApplicableConfig(configs, 'concept-1', 'building-1', asOfDate)

      expect(result).toBeNull()
    })

    it('excludes configs that have expired (effectiveTo in past)', () => {
      const configs: TInterestConfiguration[] = [
        makeConfig({
          id: 'expired-config',
          paymentConceptId: null,
          buildingId: null,
          effectiveFrom: '2024-01-01',
          effectiveTo: '2025-06-30',
        }),
      ]
      const asOfDate = new Date('2025-07-15')

      const result = service.findApplicableConfig(configs, 'concept-1', 'building-1', asOfDate)

      expect(result).toBeNull()
    })

    it('includes configs within effective range', () => {
      const configs: TInterestConfiguration[] = [
        makeConfig({
          id: 'active-config',
          paymentConceptId: null,
          buildingId: null,
          effectiveFrom: '2025-01-01',
          effectiveTo: '2025-12-31',
        }),
      ]
      const asOfDate = new Date('2025-07-15')

      const result = service.findApplicableConfig(configs, 'concept-1', 'building-1', asOfDate)

      expect(result).not.toBeNull()
      expect(result!.id).toBe('active-config')
    })

    it('includes configs with null effectiveTo (open-ended)', () => {
      const configs: TInterestConfiguration[] = [
        makeConfig({
          id: 'open-ended',
          paymentConceptId: null,
          buildingId: null,
          effectiveFrom: '2025-01-01',
          effectiveTo: null,
        }),
      ]
      const asOfDate = new Date('2030-12-31')

      const result = service.findApplicableConfig(configs, 'concept-1', 'building-1', asOfDate)

      expect(result).not.toBeNull()
      expect(result!.id).toBe('open-ended')
    })

    it('skips expired concept-level config and falls back to active building-level', () => {
      const configs: TInterestConfiguration[] = [
        makeConfig({
          id: 'expired-concept',
          paymentConceptId: 'concept-1',
          buildingId: null,
          effectiveFrom: '2024-01-01',
          effectiveTo: '2024-12-31',
        }),
        makeConfig({
          id: 'active-building',
          paymentConceptId: null,
          buildingId: 'building-1',
          effectiveFrom: '2025-01-01',
          effectiveTo: null,
        }),
      ]
      const asOfDate = new Date('2025-07-15')

      const result = service.findApplicableConfig(configs, 'concept-1', 'building-1', asOfDate)

      expect(result).not.toBeNull()
      expect(result!.id).toBe('active-building')
    })

    it('without asOfDate, only checks isActive (backward compatible)', () => {
      const configs: TInterestConfiguration[] = [
        makeConfig({
          id: 'future-but-active',
          paymentConceptId: null,
          buildingId: null,
          effectiveFrom: '2099-01-01',
          isActive: true,
        }),
      ]

      // No asOfDate passed — should return config (backward compatible)
      const result = service.findApplicableConfig(configs, 'concept-1', 'building-1')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('future-but-active')
    })

    it('excludes inactive configs even within date range', () => {
      const configs: TInterestConfiguration[] = [
        makeConfig({
          id: 'inactive-in-range',
          paymentConceptId: null,
          buildingId: null,
          effectiveFrom: '2025-01-01',
          effectiveTo: '2025-12-31',
          isActive: false,
        }),
      ]
      const asOfDate = new Date('2025-07-15')

      const result = service.findApplicableConfig(configs, 'concept-1', 'building-1', asOfDate)

      expect(result).toBeNull()
    })
  })

  describe('Calculation periods', () => {
    it('daily period: interest per day', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({
        interestType: 'simple',
        interestRate: '0.01',
        calculationPeriod: 'daily',
      })
      // 10 days overdue, daily period (1 day): 1000 * 0.01 * 10 / 1 = 100.00
      const today = new Date('2025-06-25')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('100.00')
    })

    it('weekly period: interest per 7-day period', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({
        interestType: 'simple',
        interestRate: '0.05',
        calculationPeriod: 'weekly',
      })
      // 14 days overdue, weekly period (7 days): 1000 * 0.05 * 14 / 7 = 100.00
      const today = new Date('2025-06-29')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('100.00')
    })

    it('biweekly period: interest per 14-day period', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({
        interestType: 'simple',
        interestRate: '0.05',
        calculationPeriod: 'biweekly',
      })
      // 28 days overdue, biweekly period (14 days): 1000 * 0.05 * 28 / 14 = 100.00
      const today = new Date('2025-07-13')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('100.00')
    })

    it('quarterly period: interest per 90-day period', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({
        interestType: 'simple',
        interestRate: '0.05',
        calculationPeriod: 'quarterly',
      })
      // 90 days overdue, quarterly period (90 days): 1000 * 0.05 * 90 / 90 = 50.00
      const today = new Date('2025-09-13')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('50.00')
    })

    it('semi_annual period: interest per 180-day period', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({
        interestType: 'simple',
        interestRate: '0.10',
        calculationPeriod: 'semi_annual',
      })
      // 180 days overdue, semi_annual period (180 days): 1000 * 0.10 * 180 / 180 = 100.00
      const today = new Date('2025-12-12')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('100.00')
    })

    it('annual period: interest per 360-day period', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({
        interestType: 'simple',
        interestRate: '0.12',
        calculationPeriod: 'annual',
      })
      // 360 days overdue, annual period (360 days): 1000 * 0.12 * 360 / 360 = 120.00
      const today = new Date('2026-06-10')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('120.00')
    })

    it('fixed_amount with weekly period: 2 full weeks = 2x fixed amount', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({
        interestType: 'fixed_amount',
        fixedAmount: '10.00',
        calculationPeriod: 'weekly',
      })
      // 14 days overdue, weekly period (7 days): Math.floor(14/7) = 2 periods → 10 * 2 = 20.00
      const today = new Date('2025-06-29')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('20.00')
    })
  })
})
