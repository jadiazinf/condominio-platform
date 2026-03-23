import type PgBoss from 'pg-boss'
import type { TServiceExecutionCreate } from '@packages/domain'
import { DatabaseService } from '@database/service'
import {
  QuotasRepository,
  UnitsRepository,
  UnitOwnershipsRepository,
  PaymentConceptsRepository,
  PaymentConceptAssignmentsRepository,
  ServiceExecutionsRepository,
  UserRolesRepository,
  QuotaGenerationLogsRepository,
  CurrenciesRepository,
  BuildingsRepository,
  CondominiumReceiptsRepository,
} from '@database/repositories'
import { autoGenerateReceipts } from '@api/services/receipts/auto-generate-receipts.service'
import { getBossClient } from '@worker/boss/client'
import { QUEUES, type IAutoGenerateJobData, type INotifyJobData } from '@worker/boss/queues'
import logger from '@packages/logger'
import { parseAmount, roundCurrency, toDecimal } from '@packages/utils/money'
import { notifySuperadminsOnError } from '@worker/libs/notify-superadmins-on-error'

export async function processAutoGeneration(job: PgBoss.Job<IAutoGenerateJobData>): Promise<void> {
  const start = Date.now()

  logger.info({ jobId: job.id }, '[AutoGen] Starting auto-generation (assignment-based)')

  try {
    await _processAutoGeneration(job)
  } catch (error) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    const serializedError =
      error instanceof Error
        ? { message: error.message, stack: error.stack, name: error.name }
        : String(error)
    logger.error(
      { jobId: job.id, error: serializedError, elapsedSeconds: elapsed },
      '[AutoGen] Job failed with error'
    )

    await notifySuperadminsOnError({
      jobId: job.id,
      processor: 'auto-generation',
      error,
      elapsedSeconds: elapsed,
    })

    throw error
  }
}

async function _processAutoGeneration(job: PgBoss.Job<IAutoGenerateJobData>): Promise<void> {
  const start = Date.now()

  const db = DatabaseService.getInstance().getDb()
  const conceptsRepo = new PaymentConceptsRepository(db)
  const assignmentsRepo = new PaymentConceptAssignmentsRepository(db)
  const quotasRepo = new QuotasRepository(db)
  const unitsRepo = new UnitsRepository(db)
  const executionsRepo = new ServiceExecutionsRepository(db)
  const currenciesRepo = new CurrenciesRepository(db)

  // 1. Find all active recurring concepts with chargeGenerationStrategy='auto'
  const autoConcepts = await conceptsRepo.getActiveByStrategy('auto')

  if (autoConcepts.length === 0) {
    logger.info('[AutoGen] No auto-strategy concepts found')
    return
  }

  logger.info(
    {
      count: autoConcepts.length,
      concepts: autoConcepts.map(c => ({
        id: c.id,
        name: c.name,
        effectiveFrom: c.effectiveFrom,
        recurrencePeriod: c.recurrencePeriod,
        chargeGenerationStrategy: c.chargeGenerationStrategy,
        isActive: c.isActive,
        isRecurring: c.isRecurring,
      })),
    },
    '[AutoGen] Processing auto-strategy concepts'
  )

  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const currentMonth = now.getUTCMonth() + 1 // 1-based (UTC to match DB timestamps)
  const today = now.toISOString().split('T')[0]!

  let totalCreated = 0
  let totalFailed = 0
  const errors: string[] = []
  const generatedQuotas: TGeneratedQuotaInfo[] = []
  const currencyCodeCache = new Map<string, string>()

  for (const concept of autoConcepts) {
    try {
      // Calculate periods to generate: from effectiveFrom to current month (capped by effectiveUntil)
      const periods = calculatePeriodsToGenerate(
        concept.effectiveFrom,
        concept.effectiveUntil ?? null,
        concept.recurrencePeriod as 'monthly' | 'quarterly' | 'yearly',
        currentYear,
        currentMonth
      )

      if (periods.length === 0) {
        logger.warn(
          {
            conceptId: concept.id,
            conceptName: concept.name,
            effectiveFrom: concept.effectiveFrom,
            currentYear,
            currentMonth,
          },
          '[AutoGen] No periods to generate — check effectiveFrom date'
        )
        continue
      }

      logger.info(
        { conceptId: concept.id, conceptName: concept.name, periodsCount: periods.length, periods },
        '[AutoGen] Periods calculated'
      )

      // Load assignments
      const assignments = await assignmentsRepo.listByConceptId(concept.id)
      if (assignments.length === 0) {
        logger.warn(
          { conceptId: concept.id, conceptName: concept.name },
          '[AutoGen] No active assignments found for concept — create assignments in the concept wizard'
        )
        continue
      }

      logger.info(
        {
          conceptId: concept.id,
          assignmentsCount: assignments.length,
          assignments: assignments.map(a => ({
            id: a.id,
            scopeType: a.scopeType,
            amount: a.amount,
          })),
        },
        '[AutoGen] Assignments loaded'
      )

      // Resolve unit amounts once (same for all periods)
      const unitAmounts = await resolveUnitAmounts(assignments, concept.condominiumId!, unitsRepo)
      if (unitAmounts.length === 0) {
        logger.warn(
          {
            conceptId: concept.id,
            conceptName: concept.name,
            condominiumId: concept.condominiumId,
          },
          '[AutoGen] No active units resolved from assignments — check if units exist and are active'
        )
        continue
      }

      // Fetch template executions to clone per period
      const templateExecutions = await executionsRepo.getTemplatesByConceptId(concept.id)

      for (const period of periods) {
        // Check if quotas already exist for this period
        const exists = await quotasRepo.existsForConceptAndPeriod(
          concept.id,
          period.year,
          period.month
        )
        if (exists) continue // Already generated, skip silently

        const issueDay = concept.issueDay ?? 1
        const dueDay = concept.dueDay ?? 28
        const issueDate = buildDate(period.year, period.month, issueDay)
        const dueDate = buildDueDate(period.year, period.month, issueDay, dueDay)
        const periodDescription = `${MONTH_NAMES[period.month - 1]} ${period.year}`
        const quotaStatus = dueDate < today ? 'overdue' : 'pending'

        // Generate quotas + clone templates in a transaction
        await db.transaction(async tx => {
          const txQuotasRepo = quotasRepo.withTx(tx)
          const txExecutionsRepo = executionsRepo.withTx(tx)

          // Double-check inside transaction
          const existsInTx = await txQuotasRepo.existsForConceptAndPeriod(
            concept.id,
            period.year,
            period.month
          )
          if (existsInTx) return

          for (const { unitId, amount } of unitAmounts) {
            await txQuotasRepo.create({
              unitId,
              paymentConceptId: concept.id,
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
              createdBy: null,
            })
          }

          // Clone template executions
          for (const template of templateExecutions) {
            const clonedDate = template.executionDay
              ? buildDate(period.year, period.month, template.executionDay as number)
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
        })

        const periodAmount = unitAmounts.reduce((sum, ua) => sum + ua.amount, 0)
        totalCreated += unitAmounts.length

        // Resolve currency code (cached)
        if (!currencyCodeCache.has(concept.currencyId)) {
          const currency = await currenciesRepo.getById(concept.currencyId)
          currencyCodeCache.set(concept.currencyId, currency?.code ?? '')
        }

        generatedQuotas.push({
          affectedUnitIds: unitAmounts.map(ua => ua.unitId),
          paymentConceptId: concept.id,
          conceptType: concept.conceptType ?? 'other',
          condominiumId: concept.condominiumId ?? undefined,
          currencyId: concept.currencyId,
          periodYear: period.year,
          periodMonth: period.month,
          periodDescription,
          dueDate,
          totalAmount: periodAmount,
          quotasCreated: unitAmounts.length,
          currencyCode: currencyCodeCache.get(concept.currencyId) ?? '',
          generateReceipts: concept.generateReceipts !== false,
        })
      }

      logger.info(
        { conceptId: concept.id, periodsAttempted: periods.length },
        '[AutoGen] Concept processed'
      )
    } catch (error) {
      totalFailed++
      const msg = error instanceof Error ? error.message : String(error)
      errors.push(`Concept ${concept.id}: ${msg}`)
      logger.error({ conceptId: concept.id, error }, '[AutoGen] Error processing concept')
    }
  }

  // Mark overdue quotas
  await markOverdueQuotas(quotasRepo, today)

  // Log generation result to quota_generation_logs
  const userRolesRepo = new UserRolesRepository(db)
  const superadmins = await userRolesRepo.getActiveSuperadminUsers()
  const logGeneratedBy = superadmins[0]?.id ?? null

  if (logGeneratedBy) {
    try {
      const logsRepo = new QuotaGenerationLogsRepository(db)
      const totalAmount = generatedQuotas.reduce((sum, g) => sum + g.totalAmount, 0)
      const allUnitIds = [...new Set(generatedQuotas.flatMap(g => g.affectedUnitIds))]

      await logsRepo.create({
        generationRuleId: null,
        generationScheduleId: null,
        quotaFormulaId: null,
        generationMethod: 'scheduled',
        periodYear: currentYear,
        periodMonth: currentMonth,
        periodDescription: `Auto-generación ${MONTH_NAMES[currentMonth - 1]} ${currentYear}`,
        quotasCreated: totalCreated,
        quotasFailed: totalFailed,
        totalAmount: totalAmount > 0 ? totalAmount.toString() : null,
        currencyId: autoConcepts[0]?.currencyId ?? null,
        unitsAffected: allUnitIds.length > 0 ? allUnitIds : null,
        parameters: {
          jobId: job.id,
          conceptsProcessed: autoConcepts.length,
          conceptIds: autoConcepts.map(c => c.id),
        },
        formulaSnapshot: null,
        status: totalFailed > 0 ? (totalCreated > 0 ? 'partial' : 'failed') : 'completed',
        errorDetails: errors.length > 0 ? errors.join('\n') : null,
        generatedBy: logGeneratedBy,
      })
      logger.info('[AutoGen] Generation log saved to quota_generation_logs')
    } catch (logError) {
      logger.error({ error: logError }, '[AutoGen] Failed to save generation log')
    }
  }

  // Enqueue admin notification to superadmins only on failures
  try {
    if (totalFailed > 0) {
      const boss = getBossClient()

      const title = 'Generación automática completada con errores'
      const body = `Cuotas creadas: ${totalCreated}. Fallidas: ${totalFailed}. Conceptos procesados: ${autoConcepts.length}.`
      const data = { totalCreated, totalFailed, errors, conceptsProcessed: autoConcepts.length }

      for (const admin of superadmins) {
        if (!admin.id) continue
        const notification: INotifyJobData = {
          userId: admin.id,
          category: 'alert',
          title,
          body,
          channels: ['in_app', 'email'],
          data,
        }
        await boss.send(QUEUES.NOTIFY, notification)
      }

      logger.info(
        { superadminsNotified: superadmins.length },
        '[AutoGen] Admin error notifications enqueued'
      )
    } else {
      logger.info('[AutoGen] No failures — skipping superadmin notification')
    }
  } catch (notifyError) {
    logger.error({ error: notifyError }, '[AutoGen] Failed to enqueue admin notification')
  }

  // Auto-generate receipts for maintenance concepts (before notifications so we can attach PDFs)
  const unitReceiptMap = await autoGenerateReceiptsForQuotas(db, generatedQuotas)

  // Notify residents (with receiptIds for PDF attachment)
  await notifyResidentsForAutoGeneration(db, generatedQuotas, unitReceiptMap)

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  logger.info({ elapsedSeconds: elapsed, totalCreated, totalFailed }, '[AutoGen] Cycle completed')
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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

/**
 * Calculates all periods from effectiveFrom up to and including the current month,
 * respecting the recurrence period. The processor skips already-generated periods
 * via existsForConceptAndPeriod checks.
 */
function calculatePeriodsToGenerate(
  effectiveFrom: Date | null,
  effectiveUntil: Date | null,
  recurrencePeriod: 'monthly' | 'quarterly' | 'yearly',
  currentYear: number,
  currentMonth: number
): Array<{ year: number; month: number }> {
  if (!effectiveFrom) return [{ year: currentYear, month: currentMonth }]

  const fromDate = new Date(effectiveFrom)
  const monthStep = recurrencePeriod === 'monthly' ? 1 : recurrencePeriod === 'quarterly' ? 3 : 12

  // Cap generation at effectiveUntil or current month, whichever is earlier
  let endYear = currentYear
  let endMonth = currentMonth
  if (effectiveUntil) {
    const untilDate = new Date(effectiveUntil)
    const untilYear = untilDate.getUTCFullYear()
    const untilMonth = untilDate.getUTCMonth() + 1
    if (untilYear < endYear || (untilYear === endYear && untilMonth < endMonth)) {
      endYear = untilYear
      endMonth = untilMonth
    }
  }

  const periods: Array<{ year: number; month: number }> = []
  // Use UTC methods to avoid timezone issues (dates stored as UTC in DB)
  let year = fromDate.getUTCFullYear()
  let month = fromDate.getUTCMonth() + 1 // 1-based

  while (year < endYear || (year === endYear && month <= endMonth)) {
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

async function markOverdueQuotas(quotasRepo: QuotasRepository, today: string): Promise<void> {
  try {
    const markedCount = await quotasRepo.markOverdue(today)

    if (markedCount > 0) {
      logger.info({ count: markedCount }, '[AutoGen] Marked quotas as overdue')
    }
  } catch (error) {
    logger.error({ error }, '[AutoGen] Error marking overdue quotas')
  }
}

type TGeneratedQuotaInfo = {
  affectedUnitIds: string[]
  paymentConceptId: string
  conceptType: string
  condominiumId?: string
  currencyId: string
  periodYear: number
  periodMonth: number
  periodDescription: string
  dueDate: string
  totalAmount: number
  quotasCreated: number
  currencyCode: string
  generateReceipts: boolean
}

async function notifyResidentsForAutoGeneration(
  db: ReturnType<typeof DatabaseService.prototype.getDb>,
  generatedQuotas: TGeneratedQuotaInfo[],
  unitReceiptMap: Map<string, string> = new Map()
): Promise<void> {
  if (generatedQuotas.length === 0) return

  try {
    const ownershipsRepo = new UnitOwnershipsRepository(db)
    const conceptsRepo = new PaymentConceptsRepository(db)
    const boss = getBossClient()

    const conceptNames = new Map<string, string>()

    for (const quota of generatedQuotas) {
      if (!conceptNames.has(quota.paymentConceptId)) {
        const concept = await conceptsRepo.getById(quota.paymentConceptId)
        conceptNames.set(quota.paymentConceptId, concept?.name ?? 'Cuota')
      }
      const conceptName = conceptNames.get(quota.paymentConceptId)!

      const ownerships = await ownershipsRepo.getRegisteredByUnitIds(quota.affectedUnitIds)
      if (ownerships.length === 0) continue

      const notifiedUsers = new Set<string>()
      const today = new Date().toISOString().split('T')[0]!
      const isOverdue = quota.dueDate < today

      for (const ownership of ownerships) {
        if (!ownership.userId || notifiedUsers.has(ownership.userId)) continue
        notifiedUsers.add(ownership.userId)

        const perUnitAmount = toDecimal(quota.totalAmount / quota.quotasCreated)
        const currencyLabel = quota.currencyCode ? ` ${quota.currencyCode}` : ''
        let body = `Nueva cuota de "${conceptName}" - ${quota.periodDescription}. Monto: ${perUnitAmount}${currencyLabel}. Vencimiento: ${quota.dueDate}.`
        if (isOverdue) {
          body += ' (Vencida)'
        }

        // Include receiptId for PDF attachment if available
        const receiptId = unitReceiptMap.get(ownership.unitId)

        const notification: INotifyJobData = {
          userId: ownership.userId,
          category: 'quota',
          title: `Nueva cuota: ${conceptName}`,
          body,
          channels: ['in_app', 'email'],
          data: {
            condominiumId: quota.condominiumId,
            conceptName,
            paymentConceptId: quota.paymentConceptId,
            periodDescription: quota.periodDescription,
            dueDate: quota.dueDate,
            amount: perUnitAmount,
            totalAmount: perUnitAmount,
            currencyCode: quota.currencyCode,
            isOverdue,
            ...(receiptId ? { receiptId } : {}),
          },
        }

        await boss.send(QUEUES.NOTIFY, notification)
      }
    }

    logger.info(
      { quotaGroups: generatedQuotas.length },
      '[AutoGen] Resident notifications enqueued'
    )
  } catch (error) {
    logger.error({ error }, '[AutoGen] Failed to enqueue resident notifications')
  }
}

async function autoGenerateReceiptsForQuotas(
  db: ReturnType<typeof DatabaseService.prototype.getDb>,
  generatedQuotas: TGeneratedQuotaInfo[]
): Promise<Map<string, string>> {
  const unitReceiptMap = new Map<string, string>()
  if (generatedQuotas.length === 0) return unitReceiptMap

  try {
    const receiptsRepo = new CondominiumReceiptsRepository(db)
    const quotasRepo = new QuotasRepository(db)
    const unitsRepo = new UnitsRepository(db)
    const buildingsRepo = new BuildingsRepository(db)

    for (const quota of generatedQuotas) {
      if (!quota.condominiumId) continue
      if (!quota.generateReceipts) {
        logger.info(
          { conceptId: quota.paymentConceptId },
          '[AutoGen] Skipping receipt generation (generateReceipts=false)'
        )
        continue
      }

      const result = await autoGenerateReceipts(
        { receiptsRepo, quotasRepo, unitsRepo, buildingsRepo },
        {
          unitIds: quota.affectedUnitIds,
          conceptType: quota.conceptType,
          condominiumId: quota.condominiumId,
          periodYear: quota.periodYear,
          periodMonth: quota.periodMonth,
          currencyId: quota.currencyId,
          generatedBy: null,
        }
      )

      // Merge unit→receipt map
      for (const [unitId, receiptId] of result.unitReceiptMap) {
        unitReceiptMap.set(unitId, receiptId)
      }

      if (result.receiptsGenerated > 0) {
        logger.info(
          { conceptId: quota.paymentConceptId, receiptsGenerated: result.receiptsGenerated },
          '[AutoGen] Receipts auto-generated for concept'
        )
      }
    }
  } catch (error) {
    logger.error({ error }, '[AutoGen] Failed to auto-generate receipts')
  }

  return unitReceiptMap
}
