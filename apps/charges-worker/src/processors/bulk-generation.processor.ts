import type PgBoss from 'pg-boss'
import { DatabaseService } from '@database/service'
import {
  PaymentConceptsRepository,
  PaymentConceptAssignmentsRepository,
  QuotasRepository,
  QuotaGenerationLogsRepository,
  UnitsRepository,
} from '@database/repositories'
import { getBossClient } from '@worker/boss/client'
import { QUEUES, type IBulkGenerateJobData, type INotifyJobData } from '@worker/boss/queues'
import logger from '@packages/logger'

const MAX_BULK_MONTHS = 12
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export async function processBulkGeneration(
  job: PgBoss.Job<IBulkGenerateJobData>,
): Promise<void> {
  const { paymentConceptId, generatedBy } = job.data
  const start = Date.now()

  logger.info({ jobId: job.id, paymentConceptId }, '[BulkGen] Starting bulk generation')

  const db = DatabaseService.getInstance().getDb()
  const conceptsRepo = new PaymentConceptsRepository(db)
  const assignmentsRepo = new PaymentConceptAssignmentsRepository(db)
  const quotasRepo = new QuotasRepository(db)
  const logsRepo = new QuotaGenerationLogsRepository(db)
  const unitsRepo = new UnitsRepository(db)

  // 1. Validate concept
  const concept = await conceptsRepo.getById(paymentConceptId)
  if (!concept) {
    throw new Error(`Payment concept not found: ${paymentConceptId}`)
  }
  if (!concept.isActive) {
    throw new Error(`Cannot generate charges for inactive concept: ${paymentConceptId}`)
  }
  if (!concept.isRecurring || !concept.recurrencePeriod) {
    throw new Error(`Bulk generation requires a recurring concept with recurrence period`)
  }
  if (!concept.effectiveFrom) {
    throw new Error(`Effective from date is required for bulk generation`)
  }
  if (!concept.effectiveUntil) {
    throw new Error(`Effective until date is required for bulk generation`)
  }

  const fromDate = new Date(concept.effectiveFrom)
  const untilDate = new Date(concept.effectiveUntil)

  if (untilDate <= fromDate) {
    throw new Error(`Effective until date must be after effective from date`)
  }

  // 2. Calculate periods
  const periods = calculatePeriods(fromDate, untilDate, concept.recurrencePeriod as 'monthly' | 'quarterly' | 'yearly')
  if (periods.length === 0) {
    throw new Error(`No periods to generate between the effective dates`)
  }
  if (periods.length > MAX_BULK_MONTHS) {
    throw new Error(`Bulk generation is limited to ${MAX_BULK_MONTHS} periods (fiscal year limit). Got ${periods.length}`)
  }

  // 3. Load assignments and resolve units
  const assignments = await assignmentsRepo.listByConceptId(paymentConceptId)
  if (assignments.length === 0) {
    throw new Error(`No active assignments for concept: ${paymentConceptId}`)
  }

  // 4. Execute ALL periods in a single transaction (all-or-nothing)
  const result = await db.transaction(async (tx) => {
    const txQuotasRepo = quotasRepo.withTx(tx)
    const txLogsRepo = logsRepo.withTx(tx)

    let totalQuotas = 0
    let totalAmount = 0
    let periodsGenerated = 0
    let periodsSkipped = 0

    for (const period of periods) {
      // Check for existing quotas in this period (inside transaction for atomicity)
      const existing = await txQuotasRepo.getByPeriod(period.year, period.month)
      const alreadyExists = existing.some(
        q => q.paymentConceptId === paymentConceptId && q.status !== 'cancelled',
      )
      if (alreadyExists) {
        periodsSkipped++
        continue
      }

      // Resolve unit amounts for this period
      const unitAmounts = await resolveUnitAmounts(assignments, concept.condominiumId!, unitsRepo)
      if (unitAmounts.length === 0) continue

      // Calculate dates for this period
      const issueDay = concept.issueDay ?? 1
      const dueDay = concept.dueDay ?? 28
      const issueDate = buildDate(period.year, period.month, issueDay)
      const dueDate = buildDueDate(period.year, period.month, issueDay, dueDay)
      const periodDescription = `${MONTH_NAMES[period.month - 1]} ${period.year}`

      // Create quotas for each unit
      for (const { unitId, amount } of unitAmounts) {
        await txQuotasRepo.create({
          unitId,
          paymentConceptId,
          periodYear: period.year,
          periodMonth: period.month,
          periodDescription,
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

    // Create generation log
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
      parameters: {
        paymentConceptId,
        periodsCount: periods.length,
        periodsGenerated,
        periodsSkipped,
        effectiveFrom: fromDate.toISOString(),
        effectiveUntil: untilDate.toISOString(),
      },
      formulaSnapshot: null,
      status: 'completed',
      errorDetails: null,
      generatedBy,
    })

    return { totalQuotas, totalAmount, periodsGenerated, periodsSkipped }
  })

  // 5. Enqueue notification
  const boss = getBossClient()
  const notification: INotifyJobData = {
    userId: generatedBy,
    category: 'quota',
    title: 'Bulk generation completed',
    body: `Generated ${result.totalQuotas} quotas across ${result.periodsGenerated} periods. Total amount: ${result.totalAmount.toFixed(2)}.`,
    data: result,
  }
  await boss.send(QUEUES.NOTIFY, notification)

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  logger.info(
    { elapsedSeconds: elapsed, ...result },
    '[BulkGen] Bulk generation completed',
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function calculatePeriods(
  from: Date,
  until: Date,
  recurrence: 'monthly' | 'quarterly' | 'yearly',
): Array<{ year: number; month: number }> {
  const periods: Array<{ year: number; month: number }> = []
  const monthStep = recurrence === 'monthly' ? 1 : recurrence === 'quarterly' ? 3 : 12

  let year = from.getFullYear()
  let month = from.getMonth() + 1 // 1-based

  while (true) {
    const periodDate = new Date(year, month - 1, 1)
    if (periodDate > until) break

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
  const unitAmountMap = new Map<string, number>()

  const condoAssignments = assignments.filter(a => a.scopeType === 'condominium')
  const buildingAssignments = assignments.filter(a => a.scopeType === 'building')
  const unitAssignments = assignments.filter(a => a.scopeType === 'unit')

  // Condominium-wide
  for (const assignment of condoAssignments) {
    const units = await unitsRepo.getByCondominiumId(condominiumId)
    const activeUnits = units.filter((u: { isActive: boolean }) => u.isActive)
    distributeAmounts(assignment, activeUnits, unitAmountMap)
  }

  // Building-wide (overrides condo)
  for (const assignment of buildingAssignments) {
    if (!assignment.buildingId) continue
    const units = await unitsRepo.getByBuildingId(assignment.buildingId)
    const activeUnits = units.filter((u: { isActive: boolean }) => u.isActive)
    distributeAmounts(assignment, activeUnits, unitAmountMap)
  }

  // Unit-specific (overrides all)
  for (const assignment of unitAssignments) {
    if (!assignment.unitId) continue
    unitAmountMap.set(assignment.unitId, Number(assignment.amount))
  }

  return Array.from(unitAmountMap.entries()).map(([unitId, amount]) => ({ unitId, amount }))
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
        const unit = units[i]!
        if (i === units.length - 1) {
          map.set(unit.id, roundCurrency(total - distributed))
        } else {
          const amount = roundCurrency(perUnit)
          map.set(unit.id, amount)
          distributed += amount
        }
      }
      break
    }
    case 'fixed_per_unit': {
      for (const unit of units) {
        map.set(unit.id, total)
      }
      break
    }
  }
}

function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100
}

function buildDate(year: number, month: number, day: number): string {
  const maxDay = new Date(year, month, 0).getDate()
  const clampedDay = Math.min(day, maxDay)
  return `${year}-${String(month).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`
}

function buildDueDate(year: number, month: number, issueDay: number, dueDay: number): string {
  let dueYear = year
  let dueMonth = month
  if (dueDay < issueDay) {
    dueMonth += 1
    if (dueMonth > 12) {
      dueMonth = 1
      dueYear += 1
    }
  }
  return buildDate(dueYear, dueMonth, dueDay)
}
