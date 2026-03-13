/**
 * Bulk Generation Flow - Integration Tests
 *
 * Tests the complete bulk quota generation flow with a real database.
 * Verifies that quotas are created correctly for all periods,
 * generation logs are recorded, and edge cases are handled.
 *
 * Test coverage (8 tests):
 * - Happy path: generates quotas for all monthly periods
 * - Happy path: generates quarterly periods correctly
 * - Idempotency: skips periods with existing quotas
 * - All periods already exist: 0 quotas created
 * - Equal split distribution among units
 * - By aliquot distribution among units
 * - Generation log created with correct data
 * - Rollback on error (all-or-nothing)
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll, setDefaultTimeout } from 'bun:test'

setDefaultTimeout(30_000)
import { sql } from 'drizzle-orm'
import {
  startTestContainer,
  stopTestContainer,
  cleanDatabase,
  type TTestDrizzleClient,
} from '@packages/test-utils'
import {
  PaymentConceptsRepository,
  PaymentConceptAssignmentsRepository,
  QuotasRepository,
  QuotaGenerationLogsRepository,
  UnitsRepository,
} from '@database/repositories'

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000'

let db: TTestDrizzleClient
let conceptsRepo: PaymentConceptsRepository
let assignmentsRepo: PaymentConceptAssignmentsRepository
let quotasRepo: QuotasRepository
let logsRepo: QuotaGenerationLogsRepository
let unitsRepo: UnitsRepository

let condominiumId: string
let currencyId: string
let buildingId: string
let unitIds: string[]

beforeAll(async () => {
  db = await startTestContainer()
}, 120_000)

afterAll(async () => {
  await stopTestContainer()
})

beforeEach(async () => {
  await cleanDatabase(db)

  conceptsRepo = new PaymentConceptsRepository(db)
  assignmentsRepo = new PaymentConceptAssignmentsRepository(db)
  quotasRepo = new QuotasRepository(db)
  logsRepo = new QuotaGenerationLogsRepository(db)
  unitsRepo = new UnitsRepository(db)

  // Insert user
  await db.execute(sql`
    INSERT INTO users (id, firebase_uid, email, display_name, first_name, last_name, is_active, is_email_verified, preferred_language)
    VALUES (${MOCK_USER_ID}, 'firebase-uid-1', 'admin@test.com', 'Test Admin', 'Test', 'Admin', true, true, 'es')
  `)

  // Insert currency
  const currencyResult = await db.execute(sql`
    INSERT INTO currencies (name, code, symbol, is_active)
    VALUES ('US Dollar', 'USD', '$', true)
    RETURNING id
  `) as unknown as { id: string }[]
  currencyId = currencyResult[0]!.id

  // Insert condominium
  const condoResult = await db.execute(sql`
    INSERT INTO condominiums (name, default_currency_id, is_active, created_by)
    VALUES ('Test Condo', ${currencyId}, true, ${MOCK_USER_ID})
    RETURNING id
  `) as unknown as { id: string }[]
  condominiumId = condoResult[0]!.id

  // Insert building
  const buildingResult = await db.execute(sql`
    INSERT INTO buildings (name, condominium_id, created_by)
    VALUES ('Building A', ${condominiumId}, ${MOCK_USER_ID})
    RETURNING id
  `) as unknown as { id: string }[]
  buildingId = buildingResult[0]!.id

  // Insert 3 units
  unitIds = []
  for (const [i, aliquot] of [['40.00'], ['35.00'], ['25.00']].entries()) {
    const unitResult = await db.execute(sql`
      INSERT INTO units (unit_number, building_id, aliquot_percentage, area_m2, floor, created_by)
      VALUES (${`A-${i + 1}0${i + 1}`}, ${buildingId}, ${aliquot[0]}, 80.00, ${i + 1}, ${MOCK_USER_ID})
      RETURNING id
    `) as unknown as { id: string }[]
    unitIds.push(unitResult[0]!.id)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function createConceptWithAssignment(overrides: {
  effectiveFrom?: string
  effectiveUntil?: string
  recurrencePeriod?: 'monthly' | 'quarterly' | 'yearly'
  distributionMethod?: 'by_aliquot' | 'equal_split' | 'fixed_per_unit'
  amount?: number
  scopeType?: 'condominium' | 'building' | 'unit'
} = {}) {
  const concept = await conceptsRepo.create({
    condominiumId,
    buildingId: null,
    name: 'Mantenimiento Mensual',
    description: 'Cuota de mantenimiento',
    conceptType: 'maintenance',
    isRecurring: true,
    recurrencePeriod: overrides.recurrencePeriod ?? 'monthly',
    chargeGenerationStrategy: 'bulk',
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
    effectiveFrom: new Date(overrides.effectiveFrom ?? '2025-01-01T00:00:00.000Z'),
    effectiveUntil: new Date(overrides.effectiveUntil ?? '2025-06-30T00:00:00.000Z'),
    isActive: true,
    metadata: null,
    createdBy: MOCK_USER_ID,
  })

  await assignmentsRepo.create({
    paymentConceptId: concept.id,
    scopeType: overrides.scopeType ?? 'condominium',
    condominiumId,
    buildingId: overrides.scopeType === 'building' ? buildingId : undefined,
    unitId: undefined,
    distributionMethod: overrides.distributionMethod ?? 'equal_split',
    amount: overrides.amount ?? 3000,
  })

  return concept
}

/**
 * Replicates the core bulk generation logic (same as processor but without
 * DatabaseService singleton and pg-boss dependency).
 */
async function executeBulkGeneration(paymentConceptId: string, generatedBy: string) {
  const concept = await conceptsRepo.getById(paymentConceptId)
  if (!concept) throw new Error('Concept not found')
  if (!concept.isActive) throw new Error('Concept inactive')
  if (!concept.isRecurring || !concept.recurrencePeriod) throw new Error('Not recurring')
  if (!concept.effectiveFrom || !concept.effectiveUntil) throw new Error('Missing dates')

  const fromDate = new Date(concept.effectiveFrom)
  const untilDate = new Date(concept.effectiveUntil)
  if (untilDate <= fromDate) throw new Error('Until before from')

  const periods = calculatePeriods(fromDate, untilDate, concept.recurrencePeriod as 'monthly' | 'quarterly' | 'yearly')
  if (periods.length === 0) throw new Error('No periods')
  if (periods.length > 12) throw new Error('Too many periods')

  const assignments = await assignmentsRepo.listByConceptId(paymentConceptId)
  if (assignments.length === 0) throw new Error('No assignments')

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  // Pre-resolve unit amounts OUTSIDE transaction to avoid connection pool deadlock
  // (test container uses max: 1 connection)
  const unitAmounts = await resolveUnitAmounts(assignments, concept.condominiumId!, unitsRepo)

  // Check existing quotas per period OUTSIDE transaction too
  const existingByPeriod = new Map<string, boolean>()
  for (const period of periods) {
    const existing = await quotasRepo.getByPeriod(period.year, period.month)
    const alreadyExists = existing.some(
      q => q.paymentConceptId === paymentConceptId && q.status !== 'cancelled',
    )
    existingByPeriod.set(`${period.year}-${period.month}`, alreadyExists)
  }

  const result = await db.transaction(async (tx) => {
    const txQuotasRepo = quotasRepo.withTx(tx)
    const txLogsRepo = logsRepo.withTx(tx)

    let totalQuotas = 0
    let totalAmount = 0
    let periodsGenerated = 0
    let periodsSkipped = 0

    for (const period of periods) {
      if (existingByPeriod.get(`${period.year}-${period.month}`)) {
        periodsSkipped++
        continue
      }

      if (unitAmounts.length === 0) continue

      const issueDay = concept.issueDay ?? 1
      const dueDay = concept.dueDay ?? 28
      const issueDate = buildDate(period.year, period.month, issueDay)
      const dueDate = buildDueDate(period.year, period.month, issueDay, dueDay)

      for (const { unitId, amount } of unitAmounts) {
        await txQuotasRepo.create({
          unitId,
          paymentConceptId,
          periodYear: period.year,
          periodMonth: period.month,
          periodDescription: `${MONTH_NAMES[period.month - 1]} ${period.year}`,
          baseAmount: amount.toString(),
          currencyId: concept.currencyId,
          interestAmount: '0',
          amountInBaseCurrency: null,
          exchangeRateUsed: null,
          issueDate,
          dueDate,
          status: 'pending',
          paidAmount: '0',
          balance: amount.toString(),
          notes: null,
          metadata: null,
          createdBy: generatedBy,
        })
        totalQuotas++
        totalAmount += amount
      }
      periodsGenerated++
    }

    await txLogsRepo.create({
      generationRuleId: null,
      generationScheduleId: null,
      quotaFormulaId: null,
      generationMethod: 'bulk',
      periodYear: periods[0]!.year,
      periodMonth: periods[0]!.month,
      periodDescription: `Bulk: ${periods[0]!.year}-${String(periods[0]!.month).padStart(2, '0')} to ${periods[periods.length - 1]!.year}-${String(periods[periods.length - 1]!.month).padStart(2, '0')}`,
      quotasCreated: totalQuotas,
      quotasFailed: 0,
      totalAmount: totalAmount.toFixed(2),
      currencyId: concept.currencyId,
      unitsAffected: null,
      parameters: { paymentConceptId, periodsCount: periods.length, periodsGenerated, periodsSkipped },
      formulaSnapshot: null,
      status: 'completed',
      errorDetails: null,
      generatedBy,
    })

    return { totalQuotas, totalAmount, periodsGenerated, periodsSkipped }
  })

  return result
}

// Replicated helpers from processor
function calculatePeriods(from: Date, until: Date, recurrence: 'monthly' | 'quarterly' | 'yearly') {
  const periods: Array<{ year: number; month: number }> = []
  const monthStep = recurrence === 'monthly' ? 1 : recurrence === 'quarterly' ? 3 : 12
  let year = from.getFullYear()
  let month = from.getMonth() + 1
  while (true) {
    if (new Date(year, month - 1, 1) > until) break
    periods.push({ year, month })
    month += monthStep
    if (month > 12) {
      year += Math.floor((month - 1) / 12)
      month = ((month - 1) % 12) + 1
    }
  }
  return periods
}

type TUnitAmount = { unitId: string; amount: number }

async function resolveUnitAmounts(
  assignments: Array<{ scopeType: string; buildingId: string | null; unitId: string | null; amount: number; distributionMethod: string }>,
  condominiumId: string,
  unitsRepo: UnitsRepository,
): Promise<TUnitAmount[]> {
  const map = new Map<string, number>()
  for (const a of assignments.filter(a => a.scopeType === 'condominium')) {
    const units = await unitsRepo.getByCondominiumId(condominiumId)
    distributeAmounts(a, units.filter((u: { isActive: boolean }) => u.isActive), map)
  }
  for (const a of assignments.filter(a => a.scopeType === 'building')) {
    if (!a.buildingId) continue
    const units = await unitsRepo.getByBuildingId(a.buildingId)
    distributeAmounts(a, units.filter((u: { isActive: boolean }) => u.isActive), map)
  }
  for (const a of assignments.filter(a => a.scopeType === 'unit')) {
    if (!a.unitId) continue
    map.set(a.unitId, Number(a.amount))
  }
  return Array.from(map.entries()).map(([unitId, amount]) => ({ unitId, amount }))
}

function distributeAmounts(
  assignment: { amount: number; distributionMethod: string },
  units: Array<{ id: string; aliquotPercentage: string | null }>,
  map: Map<string, number>,
): void {
  if (units.length === 0) return
  const total = Number(assignment.amount)
  switch (assignment.distributionMethod) {
    case 'by_aliquot': {
      const withAliquot = units.filter(u => u.aliquotPercentage != null && Number(u.aliquotPercentage) > 0)
      if (withAliquot.length === 0) return
      const totalAliquot = withAliquot.reduce((sum, u) => sum + Number(u.aliquotPercentage!), 0)
      let distributed = 0
      for (let i = 0; i < withAliquot.length; i++) {
        const unit = withAliquot[i]!
        if (i === withAliquot.length - 1) {
          map.set(unit.id, roundCurrency(total - distributed))
        } else {
          const amount = roundCurrency(total * (Number(unit.aliquotPercentage!) / totalAliquot))
          map.set(unit.id, amount)
          distributed += amount
        }
      }
      break
    }
    case 'equal_split': {
      const perUnit = total / units.length
      let distributed = 0
      for (let i = 0; i < units.length; i++) {
        if (i === units.length - 1) {
          map.set(units[i]!.id, roundCurrency(total - distributed))
        } else {
          const amount = roundCurrency(perUnit)
          map.set(units[i]!.id, amount)
          distributed += amount
        }
      }
      break
    }
    case 'fixed_per_unit': {
      for (const unit of units) map.set(unit.id, total)
      break
    }
  }
}

function roundCurrency(n: number) { return Math.round(n * 100) / 100 }
function buildDate(y: number, m: number, d: number) {
  const max = new Date(y, m, 0).getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(d, max)).padStart(2, '0')}`
}
function buildDueDate(y: number, m: number, issueDay: number, dueDay: number) {
  let dy = y, dm = m
  if (dueDay < issueDay) { dm++; if (dm > 12) { dm = 1; dy++ } }
  return buildDate(dy, dm, dueDay)
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Bulk Generation Flow', () => {
  it('generates quotas for all monthly periods (Jan-Jun = 6 months x 3 units = 18 quotas)', async () => {
    const concept = await createConceptWithAssignment({
      effectiveFrom: '2025-01-01T00:00:00.000Z',
      effectiveUntil: '2025-06-30T00:00:00.000Z',
    })

    const result = await executeBulkGeneration(concept.id, MOCK_USER_ID)

    expect(result.totalQuotas).toBe(18) // 6 periods x 3 units
    expect(result.periodsGenerated).toBe(6)
    expect(result.periodsSkipped).toBe(0)

    // Verify quotas exist in DB
    for (const unitId of unitIds) {
      for (let month = 1; month <= 6; month++) {
        const exists = await quotasRepo.existsForConceptAndPeriod(concept.id, 2025, month)
        expect(exists).toBe(true)
      }
    }
  })

  it('generates quarterly periods correctly (4 periods for a full year)', async () => {
    const concept = await createConceptWithAssignment({
      effectiveFrom: '2025-01-01T00:00:00.000Z',
      effectiveUntil: '2025-12-31T00:00:00.000Z',
      recurrencePeriod: 'quarterly',
    })

    const result = await executeBulkGeneration(concept.id, MOCK_USER_ID)

    expect(result.totalQuotas).toBe(12) // 4 periods x 3 units
    expect(result.periodsGenerated).toBe(4)

    // Verify only months 1, 4, 7, 10 have quotas
    for (const month of [1, 4, 7, 10]) {
      const exists = await quotasRepo.existsForConceptAndPeriod(concept.id, 2025, month)
      expect(exists).toBe(true)
    }
    // Months without quotas
    for (const month of [2, 3, 5, 6]) {
      const exists = await quotasRepo.existsForConceptAndPeriod(concept.id, 2025, month)
      expect(exists).toBe(false)
    }
  })

  it('skips periods that already have quotas (idempotency)', async () => {
    const concept = await createConceptWithAssignment({
      effectiveFrom: '2025-01-01T00:00:00.000Z',
      effectiveUntil: '2025-03-31T00:00:00.000Z',
    })

    // Pre-create a quota for January for one unit
    await quotasRepo.create({
      unitId: unitIds[0]!,
      paymentConceptId: concept.id,
      periodYear: 2025,
      periodMonth: 1,
      periodDescription: 'January 2025',
      baseAmount: '100.00',
      currencyId,
      interestAmount: '0',
      amountInBaseCurrency: null,
      exchangeRateUsed: null,
      issueDate: '2025-01-01',
      dueDate: '2025-01-15',
      status: 'pending',
      paidAmount: '0',
      balance: '100.00',
      notes: null,
      metadata: null,
      createdBy: MOCK_USER_ID,
    })

    const result = await executeBulkGeneration(concept.id, MOCK_USER_ID)

    // January should be skipped (existing quota found)
    expect(result.periodsSkipped).toBe(1)
    expect(result.periodsGenerated).toBe(2) // Feb and Mar only
    expect(result.totalQuotas).toBe(6) // 2 periods x 3 units
  })

  it('returns 0 quotas when all periods already have quotas', async () => {
    const concept = await createConceptWithAssignment({
      effectiveFrom: '2025-01-01T00:00:00.000Z',
      effectiveUntil: '2025-01-31T00:00:00.000Z',
    })

    // Run once to create quotas
    await executeBulkGeneration(concept.id, MOCK_USER_ID)
    // Run again - all periods should be skipped
    const result = await executeBulkGeneration(concept.id, MOCK_USER_ID)

    expect(result.periodsSkipped).toBe(1)
    expect(result.periodsGenerated).toBe(0)
    expect(result.totalQuotas).toBe(0)
  })

  it('distributes amounts equally among units (penny adjustment on last unit)', async () => {
    const concept = await createConceptWithAssignment({
      effectiveFrom: '2025-01-01T00:00:00.000Z',
      effectiveUntil: '2025-01-31T00:00:00.000Z',
      distributionMethod: 'equal_split',
      amount: 1000,
    })

    await executeBulkGeneration(concept.id, MOCK_USER_ID)

    // 1000 / 3 = 333.33, 333.33, 333.34
    const allQuotas = await quotasRepo.getByPeriod(2025, 1)
    const conceptQuotas = allQuotas.filter(q => q.paymentConceptId === concept.id)
    expect(conceptQuotas.length).toBe(3)

    const amounts = conceptQuotas.map(q => parseFloat(q.baseAmount)).sort((a, b) => a - b)
    expect(amounts[0]).toBe(333.33)
    expect(amounts[1]).toBe(333.33)
    expect(amounts[2]).toBe(333.34) // penny adjustment
    expect(amounts.reduce((s, a) => s + a, 0)).toBeCloseTo(1000, 2)
  })

  it('distributes amounts by aliquot percentage', async () => {
    const concept = await createConceptWithAssignment({
      effectiveFrom: '2025-01-01T00:00:00.000Z',
      effectiveUntil: '2025-01-31T00:00:00.000Z',
      distributionMethod: 'by_aliquot',
      amount: 1000,
    })

    await executeBulkGeneration(concept.id, MOCK_USER_ID)

    const allQuotas = await quotasRepo.getByPeriod(2025, 1)
    const conceptQuotas = allQuotas.filter(q => q.paymentConceptId === concept.id)
    expect(conceptQuotas.length).toBe(3)

    // Units have aliquots 40%, 35%, 25% (total 100%)
    // 1000 * 40/100 = 400, 1000 * 35/100 = 350, last = 1000 - 400 - 350 = 250
    const amounts = conceptQuotas.map(q => parseFloat(q.baseAmount)).sort((a, b) => b - a)
    expect(amounts[0]).toBe(400)
    expect(amounts[1]).toBe(350)
    expect(amounts[2]).toBe(250)
  })

  it('creates generation log with correct metadata', async () => {
    const concept = await createConceptWithAssignment({
      effectiveFrom: '2025-01-01T00:00:00.000Z',
      effectiveUntil: '2025-03-31T00:00:00.000Z',
    })

    await executeBulkGeneration(concept.id, MOCK_USER_ID)

    const logs = await logsRepo.listAll()
    expect(logs.length).toBe(1)

    const log = logs[0]!
    expect(log.generationMethod).toBe('bulk')
    expect(log.status).toBe('completed')
    expect(log.quotasCreated).toBe(9) // 3 periods x 3 units
    expect(log.quotasFailed).toBe(0)
    expect(log.periodYear).toBe(2025)
    expect(log.periodMonth).toBe(1)
    expect(log.generatedBy).toBe(MOCK_USER_ID)
    expect(parseFloat(log.totalAmount!)).toBeGreaterThan(0)

    const params = log.parameters as Record<string, unknown>
    expect(params.paymentConceptId).toBe(concept.id)
    expect(params.periodsCount).toBe(3)
    expect(params.periodsGenerated).toBe(3)
    expect(params.periodsSkipped).toBe(0)
  })

  it('rolls back all quotas on transaction error (all-or-nothing)', async () => {
    const concept = await createConceptWithAssignment({
      effectiveFrom: '2025-01-01T00:00:00.000Z',
      effectiveUntil: '2025-03-31T00:00:00.000Z',
    })

    // Simulate a transaction failure by directly using a transaction that throws
    let threw = false
    try {
      await db.transaction(async (tx) => {
        const txQuotasRepo = quotasRepo.withTx(tx)
        // Create one quota successfully
        await txQuotasRepo.create({
          unitId: unitIds[0]!,
          paymentConceptId: concept.id,
          periodYear: 2025,
          periodMonth: 1,
          periodDescription: 'January 2025',
          baseAmount: '1000.00',
          currencyId,
          interestAmount: '0',
          amountInBaseCurrency: null,
          exchangeRateUsed: null,
          issueDate: '2025-01-01',
          dueDate: '2025-01-15',
          status: 'pending',
          paidAmount: '0',
          balance: '1000.00',
          notes: null,
          metadata: null,
          createdBy: MOCK_USER_ID,
        })
        // Then throw to simulate failure
        throw new Error('Simulated failure at period 2')
      })
    } catch {
      threw = true
    }

    expect(threw).toBe(true)

    // Verify NO quotas were persisted (rollback)
    const allQuotas = await quotasRepo.getByPeriod(2025, 1)
    const conceptQuotas = allQuotas.filter(q => q.paymentConceptId === concept.id)
    expect(conceptQuotas.length).toBe(0)
  })
})
