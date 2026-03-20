import type PgBoss from 'pg-boss'
import type { TServiceExecutionCreate } from '@packages/domain'
import { DatabaseService } from '@database/service'
import {
  PaymentConceptsRepository,
  PaymentConceptAssignmentsRepository,
  QuotasRepository,
  QuotaGenerationLogsRepository,
  UnitsRepository,
  UnitOwnershipsRepository,
  ServiceExecutionsRepository,
} from '@database/repositories'
import { getBossClient } from '@worker/boss/client'
import { QUEUES, type IBulkGenerateJobData, type INotifyJobData } from '@worker/boss/queues'
import logger from '@packages/logger'
import { parseAmount, roundCurrency, toDecimal } from '@packages/utils/money'
import { notifySuperadminsOnError } from '@worker/libs/notify-superadmins-on-error'

const MAX_BULK_MONTHS = 12
const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export async function processBulkGeneration(job: PgBoss.Job<IBulkGenerateJobData>): Promise<void> {
  const { paymentConceptId } = job.data
  const start = Date.now()

  logger.info({ jobId: job.id, paymentConceptId }, '[BulkGen] Starting bulk generation')

  try {
    await _processBulkGeneration(job)
  } catch (error) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    const serializedError =
      error instanceof Error
        ? { message: error.message, stack: error.stack, name: error.name }
        : String(error)
    logger.error(
      { jobId: job.id, paymentConceptId, error: serializedError, elapsedSeconds: elapsed },
      '[BulkGen] Job failed with error'
    )

    await notifySuperadminsOnError({
      jobId: job.id,
      processor: 'bulk-generation',
      paymentConceptId,
      error,
      elapsedSeconds: elapsed,
    })

    throw error
  }
}

async function _processBulkGeneration(job: PgBoss.Job<IBulkGenerateJobData>): Promise<void> {
  const { paymentConceptId, generatedBy } = job.data
  const start = Date.now()

  const db = DatabaseService.getInstance().getDb()
  const conceptsRepo = new PaymentConceptsRepository(db)
  const assignmentsRepo = new PaymentConceptAssignmentsRepository(db)
  const quotasRepo = new QuotasRepository(db)
  const logsRepo = new QuotaGenerationLogsRepository(db)
  const unitsRepo = new UnitsRepository(db)
  const executionsRepo = new ServiceExecutionsRepository(db)

  // 1. Validate concept
  logger.info({ paymentConceptId }, '[BulkGen] Step 1: Fetching concept')
  const concept = await conceptsRepo.getById(paymentConceptId)
  if (!concept) {
    throw new Error(`Payment concept not found: ${paymentConceptId}`)
  }
  logger.info(
    {
      conceptId: concept.id,
      isActive: concept.isActive,
      isRecurring: concept.isRecurring,
      effectiveFrom: concept.effectiveFrom,
      effectiveUntil: concept.effectiveUntil,
    },
    '[BulkGen] Concept loaded'
  )
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
  logger.info('[BulkGen] Step 2: Calculating periods')
  const periods = calculatePeriods(
    fromDate,
    untilDate,
    concept.recurrencePeriod as 'monthly' | 'quarterly' | 'yearly'
  )
  if (periods.length === 0) {
    throw new Error(`No periods to generate between the effective dates`)
  }
  if (periods.length > MAX_BULK_MONTHS) {
    throw new Error(
      `Bulk generation is limited to ${MAX_BULK_MONTHS} periods (fiscal year limit). Got ${periods.length}`
    )
  }

  // 3. Load assignments and resolve units
  logger.info('[BulkGen] Step 3: Loading assignments')
  const assignments = await assignmentsRepo.listByConceptId(paymentConceptId)
  logger.info({ assignmentsCount: assignments.length }, '[BulkGen] Assignments loaded')
  if (assignments.length === 0) {
    throw new Error(`No active assignments for concept: ${paymentConceptId}`)
  }

  const today = new Date().toISOString().split('T')[0]!

  // 3b. Fetch template executions to clone per period
  logger.info('[BulkGen] Step 3b: Fetching template executions')
  const templateExecutions = await executionsRepo.getTemplatesByConceptId(paymentConceptId)
  logger.info({ templatesCount: templateExecutions.length }, '[BulkGen] Templates loaded')

  // 4. Resolve unit amounts
  logger.info('[BulkGen] Step 4: Resolving unit amounts')
  const preResolvedUnits = await resolveUnitAmounts(assignments, concept.condominiumId!, unitsRepo)
  logger.info(
    { unitsCount: preResolvedUnits.length, units: preResolvedUnits },
    '[BulkGen] Unit amounts resolved'
  )

  if (preResolvedUnits.length === 0) {
    throw new Error(`No active units found for concept assignments: ${paymentConceptId}`)
  }

  // 5. Execute ALL periods in a single transaction (all-or-nothing)
  logger.info({ periodsCount: periods.length }, '[BulkGen] Step 5: Starting transaction')
  const result = await db.transaction(async tx => {
    const txQuotasRepo = quotasRepo.withTx(tx)
    const txLogsRepo = logsRepo.withTx(tx)
    const txExecutionsRepo = executionsRepo.withTx(tx)

    let totalQuotas = 0
    let totalAmount = 0
    let periodsGenerated = 0
    let periodsSkipped = 0
    const affectedUnitIds = new Set<string>()
    // Track per-unit quota details for resident notifications
    const unitQuotaDetails = new Map<
      string,
      Array<{ period: string; amount: string; dueDate: string; status: string }>
    >()

    // Pre-load all existing quotas for this concept to avoid N+1 queries per period
    const existingPeriodsSet = new Set<string>()
    for (const period of periods) {
      const existing = await txQuotasRepo.existsForConceptAndPeriod(
        paymentConceptId,
        period.year,
        period.month
      )
      if (existing) {
        existingPeriodsSet.add(`${period.year}-${period.month}`)
      }
    }

    const unitAmounts = preResolvedUnits

    for (const period of periods) {
      const periodKey = `${period.year}-${period.month}`
      if (existingPeriodsSet.has(periodKey)) {
        periodsSkipped++
        continue
      }

      if (unitAmounts.length === 0) continue

      // Calculate dates for this period
      const issueDay = concept.issueDay ?? 1
      const dueDay = concept.dueDay ?? 28
      const issueDate = buildDate(period.year, period.month, issueDay)
      const dueDate = buildDueDate(period.year, period.month, issueDay, dueDay)
      const periodDescription = `${MONTH_NAMES[period.month - 1]} ${period.year}`

      // Create quotas for each unit
      const quotaStatus = dueDate < today ? 'overdue' : 'pending'

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
          status: quotaStatus,
          adjustmentsTotal: '0',
          paidAmount: '0',
          balance: amount.toString(),
          notes: null,
          metadata: null,
          createdBy: generatedBy,
        })

        totalQuotas++
        totalAmount += amount
        affectedUnitIds.add(unitId)

        if (!unitQuotaDetails.has(unitId)) {
          unitQuotaDetails.set(unitId, [])
        }
        unitQuotaDetails.get(unitId)!.push({
          period: periodDescription,
          amount: amount.toString(),
          dueDate,
          status: quotaStatus,
        })
      }

      // Clone template executions for this period
      if (templateExecutions.length > 0) {
        for (const template of templateExecutions) {
          const clonedDate = template.executionDay
            ? buildDate(period.year, period.month, template.executionDay)
            : issueDate

          await txExecutionsRepo.create({
            serviceId: template.serviceId,
            condominiumId: template.condominiumId,
            paymentConceptId: template.paymentConceptId,
            title: `${template.title} - ${periodDescription}`,
            description: template.description ?? undefined,
            executionDate: clonedDate,
            executionDay: null,
            isTemplate: false,
            totalAmount: template.totalAmount,
            currencyId: template.currencyId,
            invoiceNumber: template.invoiceNumber ?? undefined,
            items: template.items,
            attachments: template.attachments as TServiceExecutionCreate['attachments'],
            notes: template.notes ?? undefined,
          })
        }
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
      totalAmount: toDecimal(totalAmount),
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

    return {
      totalQuotas,
      totalAmount,
      periodsGenerated,
      periodsSkipped,
      affectedUnitIds: Array.from(affectedUnitIds),
      unitQuotaDetails: Object.fromEntries(unitQuotaDetails),
    }
  })

  // 5. Enqueue admin notification (in_app only for success, email only on failures)
  try {
    const boss = getBossClient()
    const notification: INotifyJobData = {
      userId: generatedBy,
      category: 'quota',
      title: 'Generación masiva completada',
      body: `Se generaron ${result.totalQuotas} cuota(s) en ${result.periodsGenerated} período(s). Monto total: ${toDecimal(result.totalAmount)}.`,
      channels: ['in_app'],
      data: result,
    }
    await boss.send(QUEUES.NOTIFY, notification)
  } catch (notifyError) {
    logger.error({ error: notifyError }, '[BulkGen] Failed to enqueue admin notification')
  }

  // 6. Notify unit residents (1 notification per user with all their quotas)
  await notifyUnitResidents(db, result, concept.name ?? 'Cuota', concept.condominiumId ?? undefined)

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  logger.info({ elapsedSeconds: elapsed, ...result }, '[BulkGen] Bulk generation completed')
}

// ─────────────────────────────────────────────────────────────────────────────
// Resident notifications
// ─────────────────────────────────────────────────────────────────────────────

type TBulkResult = {
  affectedUnitIds: string[]
  unitQuotaDetails: Record<
    string,
    Array<{ period: string; amount: string; dueDate: string; status: string }>
  >
  periodsGenerated: number
}

async function notifyUnitResidents(
  db: ReturnType<typeof DatabaseService.prototype.getDb>,
  result: TBulkResult,
  conceptName: string,
  condominiumId?: string
): Promise<void> {
  if (result.affectedUnitIds.length === 0) return

  try {
    const ownershipsRepo = new UnitOwnershipsRepository(db)
    const ownerships = await ownershipsRepo.getRegisteredByUnitIds(result.affectedUnitIds)

    if (ownerships.length === 0) return

    // Group ownerships by userId → list of unitIds
    const userUnits = new Map<string, string[]>()
    for (const ownership of ownerships) {
      if (!ownership.userId) continue
      if (!userUnits.has(ownership.userId)) {
        userUnits.set(ownership.userId, [])
      }
      userUnits.get(ownership.userId)!.push(ownership.unitId)
    }

    const boss = getBossClient()

    for (const [userId, unitIds] of userUnits) {
      // Collect all quotas for this user's units
      const userQuotas: Array<{ period: string; amount: string; dueDate: string; status: string }> =
        []
      for (const unitId of unitIds) {
        const details = result.unitQuotaDetails[unitId]
        if (details) {
          userQuotas.push(...details)
        }
      }

      if (userQuotas.length === 0) continue

      const totalAmount = userQuotas.reduce((sum, q) => sum + parseFloat(q.amount), 0)
      const overdueCount = userQuotas.filter(q => q.status === 'overdue').length

      let body = `Se generaron ${userQuotas.length} cuota(s) de "${conceptName}". Monto total: ${toDecimal(totalAmount)}.`
      if (overdueCount > 0) {
        body += ` ${overdueCount} cuota(s) vencida(s).`
      }

      const notification: INotifyJobData = {
        userId,
        category: 'quota',
        title: `Nuevas cuotas generadas: ${conceptName}`,
        body,
        channels: ['in_app', 'email'],
        data: {
          condominiumId,
          conceptName,
          quotas: userQuotas,
          totalAmount: toDecimal(totalAmount),
          periodsGenerated: result.periodsGenerated,
        },
      }

      await boss.send(QUEUES.NOTIFY, notification)
    }

    logger.info({ usersNotified: userUnits.size }, '[BulkGen] Resident notifications enqueued')
  } catch (error) {
    logger.error({ error }, '[BulkGen] Failed to enqueue resident notifications')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function calculatePeriods(
  from: Date,
  until: Date,
  recurrence: 'monthly' | 'quarterly' | 'yearly'
): Array<{ year: number; month: number }> {
  const periods: Array<{ year: number; month: number }> = []
  const monthStep = recurrence === 'monthly' ? 1 : recurrence === 'quarterly' ? 3 : 12

  // Use UTC methods to avoid timezone issues (dates stored as UTC in DB)
  let year = from.getUTCFullYear()
  let month = from.getUTCMonth() + 1 // 1-based

  const untilYear = until.getUTCFullYear()
  const untilMonth = until.getUTCMonth() + 1

  while (true) {
    if (year > untilYear || (year === untilYear && month > untilMonth)) break

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
  assignments: Array<{
    scopeType: string
    buildingId: string | null
    unitId: string | null
    amount: number
    distributionMethod: string
  }>,
  condominiumId: string,
  unitsRepo: UnitsRepository
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
    unitAmountMap.set(assignment.unitId, parseAmount(assignment.amount))
  }

  return Array.from(unitAmountMap.entries()).map(([unitId, amount]) => ({ unitId, amount }))
}

function distributeAmounts(
  assignment: { amount: number; distributionMethod: string },
  units: Array<{ id: string; aliquotPercentage: string | null }>,
  map: Map<string, number>
): void {
  if (units.length === 0) return
  const total = parseAmount(assignment.amount)

  switch (assignment.distributionMethod) {
    case 'by_aliquot': {
      const withAliquot = units.filter(
        u => u.aliquotPercentage != null && parseAmount(u.aliquotPercentage) > 0
      )
      if (withAliquot.length === 0) return
      const totalAliquot = withAliquot.reduce((sum, u) => sum + parseAmount(u.aliquotPercentage), 0)
      let distributed = 0
      for (let i = 0; i < withAliquot.length; i++) {
        const unit = withAliquot[i]!
        if (i === withAliquot.length - 1) {
          map.set(unit.id, roundCurrency(total - distributed))
        } else {
          const amount = roundCurrency(total * (parseAmount(unit.aliquotPercentage) / totalAliquot))
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
