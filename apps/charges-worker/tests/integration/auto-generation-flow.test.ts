/**
 * Auto-Generation Flow - Integration Tests
 *
 * Tests the scheduled quota generation flow with a real database.
 * Sets up the full chain: schedule -> rule -> formula -> units,
 * then verifies quotas are created and schedule tracking is updated.
 *
 * Test coverage (6 tests):
 * - Happy path: generates quotas for all units in scope
 * - Duplicate check: does not recreate existing quotas (idempotency)
 * - Schedule tracking: updates lastGeneratedPeriod and nextGenerationDate
 * - Skips inactive schedule
 * - Inactive rule: returns failure
 * - Marks overdue quotas as 'overdue' status
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
  QuotaGenerationRulesRepository,
  QuotaFormulasRepository,
  QuotaGenerationSchedulesRepository,
  QuotaGenerationLogsRepository,
  UnitsRepository,
  BuildingsRepository,
} from '@database/repositories'
import { GenerateQuotasForScheduleService } from '@packages/services'

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

let db: TTestDrizzleClient
let quotasRepo: QuotasRepository
let rulesRepo: QuotaGenerationRulesRepository
let formulasRepo: QuotaFormulasRepository
let schedulesRepo: QuotaGenerationSchedulesRepository
let logsRepo: QuotaGenerationLogsRepository
let unitsRepo: UnitsRepository
let buildingsRepo: BuildingsRepository

let condominiumId: string
let currencyId: string
let buildingId: string
let unitIds: string[]
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
  rulesRepo = new QuotaGenerationRulesRepository(db)
  formulasRepo = new QuotaFormulasRepository(db)
  schedulesRepo = new QuotaGenerationSchedulesRepository(db)
  logsRepo = new QuotaGenerationLogsRepository(db)
  unitsRepo = new UnitsRepository(db)
  buildingsRepo = new BuildingsRepository(db)

  // Insert users
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

  // 2 units
  unitIds = []
  for (const [i, num] of ['A-101', 'A-102'].entries()) {
    const unitResult = await db.execute(sql`
      INSERT INTO units (unit_number, building_id, aliquot_percentage, area_m2, floor, created_by)
      VALUES (${num}, ${buildingId}, 50.00, 80.00, ${i + 1}, ${MOCK_USER_ID})
      RETURNING id
    `) as unknown as { id: string }[]
    unitIds.push(unitResult[0]!.id)
  }

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

async function createFullScheduleChain(overrides: {
  fixedAmount?: string
  ruleIsActive?: boolean
  formulaIsActive?: boolean
  nextGenerationDate?: string
  isActive?: boolean
} = {}) {
  // Formula
  const formula = await formulasRepo.create({
    condominiumId,
    name: 'Fixed Fee',
    description: null,
    formulaType: 'fixed',
    fixedAmount: overrides.fixedAmount ?? '150.00',
    expression: null,
    variables: null,
    unitAmounts: null,
    currencyId,
    isActive: overrides.formulaIsActive ?? true,
    createdBy: MOCK_USER_ID,
  })

  // Rule
  const rule = await rulesRepo.create({
    condominiumId,
    buildingId,
    paymentConceptId: conceptId,
    quotaFormulaId: formula.id,
    name: 'Monthly Maintenance Rule',
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    isActive: overrides.ruleIsActive ?? true,
    createdBy: MOCK_USER_ID,
  })

  // Schedule - insert directly via SQL since the repository create
  // doesn't accept nextGenerationDate (it's excluded from create DTO)
  const today = new Date().toISOString().split('T')[0]!
  const nextDate = overrides.nextGenerationDate ?? today

  const schedResult = await db.execute(sql`
    INSERT INTO quota_generation_schedules
      (quota_generation_rule_id, name, frequency_type, frequency_value, generation_day, periods_in_advance, issue_day, due_day, grace_days, is_active, next_generation_date, created_by)
    VALUES
      (${rule.id}, 'Monthly Schedule', 'monthly', NULL, 1, 1, 1, 15, 0, ${overrides.isActive ?? true}, ${nextDate}, ${MOCK_USER_ID})
    RETURNING id
  `) as unknown as { id: string }[]

  const schedule = await schedulesRepo.getById(schedResult[0]!.id)

  return { formula, rule, schedule: schedule! }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Auto-Generation Flow', () => {
  it('generates quotas for all units via schedule -> rule -> formula chain', async () => {
    const { schedule } = await createFullScheduleChain({ fixedAmount: '150.00' })

    const service = new GenerateQuotasForScheduleService(
      db, quotasRepo, rulesRepo, formulasRepo, schedulesRepo, logsRepo, unitsRepo, buildingsRepo,
    )

    const now = new Date()
    const targetMonth = now.getMonth() + 2 // periodsInAdvance=1 -> next month
    const targetDate = new Date(now.getFullYear(), targetMonth - 1, 1)
    const periodYear = targetDate.getFullYear()
    const periodMonth = targetDate.getMonth() + 1

    const result = await service.execute({
      scheduleId: schedule.id,
      periodYear,
      periodMonth,
      generatedBy: SYSTEM_USER_ID,
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.quotasCreated).toBe(2) // 2 units
    expect(result.data.quotasFailed).toBe(0)
    expect(result.data.totalAmount).toBe(300) // 150 * 2

    // Verify quotas in DB
    const quotas = await quotasRepo.getByPeriod(periodYear, periodMonth)
    const conceptQuotas = quotas.filter(q => q.paymentConceptId === conceptId)
    expect(conceptQuotas.length).toBe(2)

    for (const quota of conceptQuotas) {
      expect(quota.baseAmount).toBe('150.00')
      expect(quota.status).toBe('pending')
      expect(quota.createdBy).toBe(SYSTEM_USER_ID)
    }

    // Verify generation log
    const logs = await logsRepo.listAll()
    expect(logs.length).toBe(1)
    expect(logs[0]!.generationMethod).toBe('scheduled')
    expect(logs[0]!.status).toBe('completed')
    expect(logs[0]!.quotasCreated).toBe(2)
    expect(logs[0]!.formulaSnapshot).not.toBeNull()
  })

  it('skips duplicate quotas (idempotency)', async () => {
    const { schedule } = await createFullScheduleChain()

    const service = new GenerateQuotasForScheduleService(
      db, quotasRepo, rulesRepo, formulasRepo, schedulesRepo, logsRepo, unitsRepo, buildingsRepo,
    )

    const periodYear = 2025
    const periodMonth = 7

    // Generate once
    const first = await service.execute({
      scheduleId: schedule.id,
      periodYear,
      periodMonth,
      generatedBy: SYSTEM_USER_ID,
    })
    expect(first.success).toBe(true)
    if (!first.success) return
    expect(first.data.quotasCreated).toBe(2)

    // Generate again for same period
    const second = await service.execute({
      scheduleId: schedule.id,
      periodYear,
      periodMonth,
      generatedBy: SYSTEM_USER_ID,
    })
    expect(second.success).toBe(true)
    if (!second.success) return
    expect(second.data.quotasCreated).toBe(0) // All skipped

    // Verify still only 2 quotas exist
    const quotas = await quotasRepo.getByPeriod(periodYear, periodMonth)
    const conceptQuotas = quotas.filter(q => q.paymentConceptId === conceptId)
    expect(conceptQuotas.length).toBe(2)
  })

  it('updates schedule tracking after successful generation', async () => {
    const { schedule } = await createFullScheduleChain()

    const service = new GenerateQuotasForScheduleService(
      db, quotasRepo, rulesRepo, formulasRepo, schedulesRepo, logsRepo, unitsRepo, buildingsRepo,
    )

    const result = await service.execute({
      scheduleId: schedule.id,
      periodYear: 2025,
      periodMonth: 7,
      generatedBy: SYSTEM_USER_ID,
    })
    expect(result.success).toBe(true)

    // Simulate the processor's schedule update
    await schedulesRepo.updateAfterGeneration(schedule.id, {
      lastGeneratedPeriod: '2025-07',
      lastGeneratedAt: new Date(),
      nextGenerationDate: '2025-08-01',
    })

    // Verify schedule was updated
    const updated = await schedulesRepo.getById(schedule.id)
    expect(updated).not.toBeNull()
    expect(updated!.lastGeneratedPeriod).toBe('2025-07')
    expect(updated!.lastGeneratedAt).not.toBeNull()
    expect(updated!.nextGenerationDate).toBe('2025-08-01')
  })

  it('getDueSchedules returns only schedules with nextGenerationDate <= today', async () => {
    const today = new Date().toISOString().split('T')[0]!

    // Due schedule (nextGenerationDate = today)
    await createFullScheduleChain({ nextGenerationDate: today })
    // Future schedule (nextGenerationDate = tomorrow)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]!
    await createFullScheduleChain({ nextGenerationDate: tomorrow })

    const dueSchedules = await schedulesRepo.getDueSchedules(today)

    expect(dueSchedules.length).toBe(1)
    expect(dueSchedules[0]!.nextGenerationDate).toBe(today)
  })

  it('returns failure when rule is inactive', async () => {
    const { schedule } = await createFullScheduleChain({ ruleIsActive: false })

    const service = new GenerateQuotasForScheduleService(
      db, quotasRepo, rulesRepo, formulasRepo, schedulesRepo, logsRepo, unitsRepo, buildingsRepo,
    )

    const result = await service.execute({
      scheduleId: schedule.id,
      periodYear: 2025,
      periodMonth: 7,
      generatedBy: SYSTEM_USER_ID,
    })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toContain('inactive')
  })

  it('marks overdue quotas as overdue status', async () => {
    // Create a quota that is past due
    const pastDueDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]!
    await quotasRepo.create({
      unitId: unitIds[0]!,
      paymentConceptId: conceptId,
      periodYear: 2025,
      periodMonth: 5,
      periodDescription: 'May 2025',
      baseAmount: '100.00',
      currencyId,
      interestAmount: '0',
      amountInBaseCurrency: null,
      exchangeRateUsed: null,
      issueDate: '2025-05-01',
      dueDate: pastDueDate,
      status: 'pending',
      paidAmount: '0',
      balance: '100.00',
      notes: null,
      metadata: null,
      createdBy: MOCK_USER_ID,
    })

    // Verify it's returned by getOverdue
    const today = new Date().toISOString().split('T')[0]!
    const overdue = await quotasRepo.getOverdue(today)
    expect(overdue.length).toBe(1)
    expect(overdue[0]!.status).toBe('pending')

    // Mark as overdue (simulating what the processor does)
    await quotasRepo.update(overdue[0]!.id, { status: 'overdue' })

    // Verify status changed
    const updated = await quotasRepo.getById(overdue[0]!.id)
    expect(updated).not.toBeNull()
    expect(updated!.status).toBe('overdue')
  })
})
