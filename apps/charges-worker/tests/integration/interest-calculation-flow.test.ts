/**
 * Interest Calculation Flow - Integration Tests
 *
 * Tests the complete interest calculation flow with a real database.
 * Verifies that overdue quotas accumulate interest correctly,
 * audit records are created, and edge cases are handled.
 *
 * Test coverage (7 tests):
 * - Happy path: simple interest updates quota and creates adjustment
 * - Compound interest accumulates over multiple periods
 * - Grace period: no interest within grace days
 * - Skips quotas with zero balance
 * - Skips quotas without interest configuration
 * - Incremental interest: only the difference is applied
 * - Partial payment: interest calculated on remaining balance
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll, setDefaultTimeout } from 'bun:test'
import { sql } from 'drizzle-orm'

setDefaultTimeout(30_000)

import {
  startTestContainer,
  stopTestContainer,
  cleanDatabase,
  type TTestDrizzleClient,
} from '@packages/test-utils'
import {
  QuotasRepository,
  QuotaAdjustmentsRepository,
  InterestConfigurationsRepository,
} from '@database/repositories'
import { InterestCalculationService } from '../../src/services/interest-calculation.service'

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

let db: TTestDrizzleClient
let quotasRepo: QuotasRepository
let adjustmentsRepo: QuotaAdjustmentsRepository
let interestConfigsRepo: InterestConfigurationsRepository
let calcService: InterestCalculationService

let condominiumId: string
let currencyId: string
let buildingId: string
let unitId: string
let conceptId: string

beforeAll(async () => {
  db = await startTestContainer()
}, 120_000)

afterAll(async () => {
  await stopTestContainer()
})

beforeEach(async () => {
  await cleanDatabase(db)

  quotasRepo = new QuotasRepository(db)
  adjustmentsRepo = new QuotaAdjustmentsRepository(db)
  interestConfigsRepo = new InterestConfigurationsRepository(db)
  calcService = new InterestCalculationService()

  // Insert users (regular + system)
  await db.execute(sql`
    INSERT INTO users (id, firebase_uid, email, display_name, first_name, last_name, is_active, is_email_verified, preferred_language)
    VALUES
      (${MOCK_USER_ID}, 'firebase-uid-1', 'admin@test.com', 'Test Admin', 'Test', 'Admin', true, true, 'es'),
      (${SYSTEM_USER_ID}, 'system-uid', 'system@test.com', 'System', 'System', 'User', true, true, 'es')
  `)

  // Currency
  const currencyResult = await db.execute(sql`
    INSERT INTO currencies (name, code, symbol, is_active)
    VALUES ('US Dollar', 'USD', '$', true)
    RETURNING id
  `) as unknown as { id: string }[]
  currencyId = currencyResult[0]!.id

  // Condominium
  const condoResult = await db.execute(sql`
    INSERT INTO condominiums (name, default_currency_id, is_active, created_by)
    VALUES ('Test Condo', ${currencyId}, true, ${MOCK_USER_ID})
    RETURNING id
  `) as unknown as { id: string }[]
  condominiumId = condoResult[0]!.id

  // Building
  const buildingResult = await db.execute(sql`
    INSERT INTO buildings (name, condominium_id, created_by)
    VALUES ('Building A', ${condominiumId}, ${MOCK_USER_ID})
    RETURNING id
  `) as unknown as { id: string }[]
  buildingId = buildingResult[0]!.id

  // Unit
  const unitResult = await db.execute(sql`
    INSERT INTO units (unit_number, building_id, aliquot_percentage, created_by)
    VALUES ('A-101', ${buildingId}, 100.00, ${MOCK_USER_ID})
    RETURNING id
  `) as unknown as { id: string }[]
  unitId = unitResult[0]!.id

  // Payment concept
  const conceptResult = await db.execute(sql`
    INSERT INTO payment_concepts (name, condominium_id, concept_type, is_recurring, recurrence_period, currency_id, issue_day, due_day, is_active, created_by)
    VALUES ('Mantenimiento', ${condominiumId}, 'maintenance', true, 'monthly', ${currencyId}, 1, 15, true, ${MOCK_USER_ID})
    RETURNING id
  `) as unknown as { id: string }[]
  conceptId = conceptResult[0]!.id
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function createOverdueQuota(overrides: {
  dueDate?: string
  baseAmount?: string
  balance?: string
  interestAmount?: string
  paidAmount?: string
} = {}) {
  return quotasRepo.create({
    unitId,
    paymentConceptId: conceptId,
    periodYear: 2025,
    periodMonth: 6,
    periodDescription: 'June 2025',
    baseAmount: overrides.baseAmount ?? '1000.00',
    currencyId,
    interestAmount: overrides.interestAmount ?? '0',
    amountInBaseCurrency: null,
    exchangeRateUsed: null,
    issueDate: '2025-06-01',
    dueDate: overrides.dueDate ?? '2025-06-15',
    status: 'pending', // getOverdue checks status='pending' AND dueDate <= today
    paidAmount: overrides.paidAmount ?? '0',
    balance: overrides.balance ?? overrides.baseAmount ?? '1000.00',
    notes: null,
    metadata: null,
    createdBy: MOCK_USER_ID,
  })
}

async function createInterestConfig(overrides: {
  interestType?: 'simple' | 'compound' | 'fixed_amount'
  interestRate?: string
  fixedAmount?: string
  gracePeriodDays?: number
  calculationPeriod?: 'monthly' | 'daily' | 'per_overdue_quota'
} = {}) {
  return interestConfigsRepo.create({
    condominiumId,
    buildingId: null,
    paymentConceptId: conceptId,
    name: 'Test Interest Config',
    description: null,
    interestType: overrides.interestType ?? 'simple',
    interestRate: overrides.interestRate ?? '0.05',
    fixedAmount: overrides.fixedAmount ?? null,
    calculationPeriod: overrides.calculationPeriod ?? 'monthly',
    gracePeriodDays: overrides.gracePeriodDays ?? 0,
    currencyId,
    isActive: true,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    metadata: null,
    createdBy: MOCK_USER_ID,
  })
}

/**
 * Replicates the interest calculation processor flow
 * (without DatabaseService singleton dependency).
 */
async function executeInterestCalculation(asOfDate: Date) {
  const todayStr = asOfDate.toISOString().split('T')[0]!
  const overdueQuotas = await quotasRepo.getOverdue(todayStr)

  let processed = 0
  let updated = 0
  let skipped = 0

  for (const quota of overdueQuotas) {
    if (parseFloat(quota.balance) <= 0) {
      skipped++
      continue
    }

    const config = await interestConfigsRepo.getActiveForDate(quota.paymentConceptId, todayStr)
    if (!config) {
      skipped++
      continue
    }

    const result = calcService.calculate(quota, config, asOfDate)
    if (!result) {
      skipped++
      continue
    }

    await db.transaction(async (tx) => {
      const txQuotasRepo = quotasRepo.withTx(tx)
      const txAdjustmentsRepo = adjustmentsRepo.withTx(tx)

      await txQuotasRepo.update(quota.id, {
        interestAmount: result.newInterest,
        balance: result.newBalance,
      })

      await txAdjustmentsRepo.create({
        quotaId: quota.id,
        previousAmount: result.previousInterest,
        newAmount: result.newInterest,
        adjustmentType: 'increase',
        reason: `Interest calculation: ${config.interestType} rate applied. ${result.daysOverdue} days overdue. Increment: ${result.calculatedInterest.toFixed(2)}`,
        createdBy: SYSTEM_USER_ID,
      })
    })

    updated++
    processed++
  }

  return { processed, updated, skipped, total: overdueQuotas.length }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Interest Calculation Flow', () => {
  it('applies simple interest and creates audit adjustment', async () => {
    await createOverdueQuota({ dueDate: '2025-06-15', baseAmount: '1000.00' })
    await createInterestConfig({ interestType: 'simple', interestRate: '0.05', calculationPeriod: 'monthly' })

    // 30 days overdue: 1000 * 0.05 * 30/30 = 50.00
    const result = await executeInterestCalculation(new Date('2025-07-15'))

    expect(result.updated).toBe(1)
    expect(result.skipped).toBe(0)

    // Verify quota was updated in DB
    const quotas = await quotasRepo.getByPeriod(2025, 6)
    const quota = quotas.find(q => q.paymentConceptId === conceptId)!
    expect(quota.interestAmount).toBe('50.00')
    expect(parseFloat(quota.balance)).toBe(1050.00) // 1000 + 50

    // Verify adjustment audit record
    const adjustments = await adjustmentsRepo.getByQuotaId(quota.id)
    expect(adjustments.length).toBe(1)
    expect(adjustments[0]!.adjustmentType).toBe('increase')
    expect(adjustments[0]!.previousAmount).toBe('0.00')
    expect(adjustments[0]!.newAmount).toBe('50.00')
    expect(adjustments[0]!.createdBy).toBe(SYSTEM_USER_ID)
  })

  it('applies compound interest correctly over multiple periods', async () => {
    await createOverdueQuota({ dueDate: '2025-06-15', baseAmount: '1000.00' })
    await createInterestConfig({
      interestType: 'compound',
      interestRate: '0.05',
      calculationPeriod: 'monthly',
    })

    // 60 days overdue = 2 periods: 1000 * ((1.05)^2 - 1) = 102.50
    const result = await executeInterestCalculation(new Date('2025-08-14'))

    expect(result.updated).toBe(1)

    const quotas = await quotasRepo.getByPeriod(2025, 6)
    const quota = quotas.find(q => q.paymentConceptId === conceptId)!
    expect(parseFloat(quota.interestAmount)).toBeCloseTo(102.50, 1)
    expect(parseFloat(quota.balance)).toBeCloseTo(1102.50, 1)
  })

  it('does not apply interest within grace period', async () => {
    await createOverdueQuota({ dueDate: '2025-06-15', baseAmount: '1000.00' })
    await createInterestConfig({
      interestType: 'simple',
      interestRate: '0.05',
      gracePeriodDays: 10,
    })

    // 5 days overdue, grace period is 10 days -> no interest
    const result = await executeInterestCalculation(new Date('2025-06-20'))

    expect(result.updated).toBe(0)
    expect(result.skipped).toBe(1)

    // Verify quota was NOT modified
    const quotas = await quotasRepo.getByPeriod(2025, 6)
    const quota = quotas.find(q => q.paymentConceptId === conceptId)!
    expect(quota.interestAmount).toBe('0.00')
    expect(parseFloat(quota.balance)).toBe(1000.00)
  })

  it('skips quotas with zero balance', async () => {
    await createOverdueQuota({
      dueDate: '2025-06-15',
      baseAmount: '1000.00',
      paidAmount: '1000.00',
      balance: '0',
    })
    await createInterestConfig()

    const result = await executeInterestCalculation(new Date('2025-07-15'))

    expect(result.skipped).toBe(1)
    expect(result.updated).toBe(0)
  })

  it('skips quotas without applicable interest configuration', async () => {
    await createOverdueQuota({ dueDate: '2025-06-15' })
    // No interest config created

    const result = await executeInterestCalculation(new Date('2025-07-15'))

    expect(result.skipped).toBe(1)
    expect(result.updated).toBe(0)
  })

  it('applies only incremental interest when previous interest exists', async () => {
    // Quota already has 30.00 interest applied
    const quota = await createOverdueQuota({
      dueDate: '2025-06-15',
      baseAmount: '1000.00',
      balance: '1000.00',
      interestAmount: '30.00',
    })
    await createInterestConfig({
      interestType: 'simple',
      interestRate: '0.05',
      calculationPeriod: 'monthly',
    })

    // 30 days: total interest = 50.00, previous = 30.00, increment = 20.00
    const result = await executeInterestCalculation(new Date('2025-07-15'))

    expect(result.updated).toBe(1)

    // Verify the new interest is the TOTAL (50.00), not additive
    const updated = await quotasRepo.getById(quota.id)
    expect(updated).not.toBeNull()
    expect(updated!.interestAmount).toBe('50.00')

    // newBalance = baseAmount + newInterest - paidAmount = 1000 + 50 - 0 = 1050
    expect(parseFloat(updated!.balance)).toBe(1050.00)

    // Adjustment shows previous=30, new=50
    const adjustments = await adjustmentsRepo.getByQuotaId(quota.id)
    expect(adjustments.length).toBe(1)
    expect(adjustments[0]!.previousAmount).toBe('30.00')
    expect(adjustments[0]!.newAmount).toBe('50.00')
  })

  it('calculates interest on remaining balance after partial payment', async () => {
    await createOverdueQuota({
      dueDate: '2025-06-15',
      baseAmount: '1000.00',
      paidAmount: '400.00',
      balance: '600.00',
    })
    await createInterestConfig({
      interestType: 'simple',
      interestRate: '0.05',
      calculationPeriod: 'monthly',
    })

    // 30 days: interest on 600 balance: 600 * 0.05 * 30/30 = 30.00
    const result = await executeInterestCalculation(new Date('2025-07-15'))

    expect(result.updated).toBe(1)

    const quotas = await quotasRepo.getByPeriod(2025, 6)
    const quota = quotas.find(q => q.paymentConceptId === conceptId)!
    expect(quota.interestAmount).toBe('30.00')
    // Balance was 600 + interest 30 = 630
    expect(parseFloat(quota.balance)).toBe(630.00)
  })
})
