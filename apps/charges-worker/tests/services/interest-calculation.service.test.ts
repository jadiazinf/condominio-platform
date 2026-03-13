/**
 * Interest Calculation Service - Unit Tests
 *
 * Test coverage (12 tests):
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
      const config = makeConfig({ interestType: 'simple', interestRate: '0.05', calculationPeriod: 'monthly' })
      // 30 days overdue, rate 5%, monthly period (30 days)
      // 1000 * 0.05 * 30 / 30 = 50.00
      const today = new Date('2025-07-15')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('50.00')
      expect(result!.calculatedInterest).toBe(50.00)
    })

    it('calculates proportional interest for partial period', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({ interestType: 'simple', interestRate: '0.05', calculationPeriod: 'monthly' })
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
      const config = makeConfig({ interestType: 'compound', interestRate: '0.05', calculationPeriod: 'monthly' })
      // 30 days overdue = 1 period: 1000 * ((1 + 0.05)^1 - 1) = 50.00
      const today = new Date('2025-07-15')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('50.00')
    })

    it('compounds over multiple periods', () => {
      const quota = makeQuota({ dueDate: '2025-06-15', balance: '1000.00' })
      const config = makeConfig({ interestType: 'compound', interestRate: '0.05', calculationPeriod: 'monthly' })
      // 60 days overdue = 2 periods: 1000 * ((1 + 0.05)^2 - 1) = 102.50
      const today = new Date('2025-08-14')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(parseFloat(result!.newInterest)).toBeCloseTo(102.50, 1)
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
      const config = makeConfig({ interestType: 'simple', interestRate: '0.05', calculationPeriod: 'monthly' })
      // 30 days overdue: total interest = 50.00
      // Previous interest = 30.00, so incremental = 20.00
      const today = new Date('2025-07-15')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('50.00')
      expect(result!.calculatedInterest).toBe(20.00) // incremental only
    })

    it('returns null when calculated interest is less than already applied', () => {
      const quota = makeQuota({
        dueDate: '2025-06-15',
        balance: '1000.00',
        interestAmount: '100.00', // More than what would be calculated
      })
      const config = makeConfig({ interestType: 'simple', interestRate: '0.05', calculationPeriod: 'monthly' })
      // 30 days: total = 50.00, but already applied 100.00
      const today = new Date('2025-07-15')

      const result = service.calculate(quota, config, today)

      expect(result).toBeNull()
    })

    it('calculates interest on balance (partial payment)', () => {
      const quota = makeQuota({
        dueDate: '2025-06-15',
        baseAmount: '1000.00',
        paidAmount: '400.00',
        balance: '600.00', // Partial payment made
      })
      const config = makeConfig({ interestType: 'simple', interestRate: '0.05', calculationPeriod: 'monthly' })
      // 30 days overdue, interest on balance 600: 600 * 0.05 * 30 / 30 = 30.00
      const today = new Date('2025-07-15')

      const result = service.calculate(quota, config, today)

      expect(result).not.toBeNull()
      expect(result!.newInterest).toBe('30.00')
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
})
