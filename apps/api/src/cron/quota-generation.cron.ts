import { DatabaseService } from '@database/service'
import {
  QuotasRepository,
  QuotaGenerationRulesRepository,
  QuotaFormulasRepository,
  QuotaGenerationSchedulesRepository,
  QuotaGenerationLogsRepository,
  UnitsRepository,
  BuildingsRepository,
} from '@database/repositories'
import { GenerateQuotasForScheduleService } from '@services/quotas/generate-quotas-for-schedule.service'
import logger from '@utils/logger'

const ONE_HOUR_MS = 60 * 60 * 1000

async function runQuotaGeneration(): Promise<void> {
  const start = Date.now()

  try {
    const db = DatabaseService.getInstance().getDb()
    const schedulesRepo = new QuotaGenerationSchedulesRepository(db)
    const rulesRepo = new QuotaGenerationRulesRepository(db)
    const formulasRepo = new QuotaFormulasRepository(db)
    const quotasRepo = new QuotasRepository(db)
    const logsRepo = new QuotaGenerationLogsRepository(db)
    const unitsRepo = new UnitsRepository(db)
    const buildingsRepo = new BuildingsRepository(db)

    const today = new Date().toISOString().split('T')[0]!
    const dueSchedules = await schedulesRepo.getDueSchedules(today)

    if (dueSchedules.length === 0) {
      logger.info('[QuotaGen Cron] No due schedules found')
      return
    }

    logger.info({ count: dueSchedules.length }, '[QuotaGen Cron] Processing due schedules')

    const service = new GenerateQuotasForScheduleService(
      db, quotasRepo, rulesRepo, formulasRepo, schedulesRepo, logsRepo, unitsRepo, buildingsRepo
    )

    for (const schedule of dueSchedules) {
      try {
        // Determine the target period
        const { periodYear, periodMonth } = calculateTargetPeriod(schedule)

        // Use a system user ID for automated generation
        const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

        const result = await service.execute({
          scheduleId: schedule.id,
          periodYear,
          periodMonth,
          generatedBy: SYSTEM_USER_ID,
        })

        if (result.success) {
          logger.info(
            {
              scheduleId: schedule.id,
              quotasCreated: result.data.quotasCreated,
              quotasFailed: result.data.quotasFailed,
              totalAmount: result.data.totalAmount,
            },
            '[QuotaGen Cron] Schedule processed successfully'
          )

          // Update schedule tracking
          const nextDate = calculateNextGenerationDate(schedule)
          await schedulesRepo.updateAfterGeneration(schedule.id, {
            lastGeneratedPeriod: `${periodYear}-${String(periodMonth).padStart(2, '0')}`,
            lastGeneratedAt: new Date(),
            nextGenerationDate: nextDate,
          })
        } else {
          logger.error(
            { scheduleId: schedule.id, error: result.error },
            '[QuotaGen Cron] Schedule processing failed'
          )
        }
      } catch (error) {
        logger.error(
          { scheduleId: schedule.id, error },
          '[QuotaGen Cron] Error processing schedule'
        )
      }
    }

    // Also mark overdue quotas
    await markOverdueQuotas(quotasRepo, today)

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    logger.info({ elapsedSeconds: elapsed }, '[QuotaGen Cron] Quota generation cycle completed')
  } catch (error) {
    logger.error({ error }, '[QuotaGen Cron] Fatal error in quota generation cycle')
  }
}

function calculateTargetPeriod(schedule: { periodsInAdvance: number }): { periodYear: number; periodMonth: number } {
  const now = new Date()
  const advance = schedule.periodsInAdvance ?? 1
  const target = new Date(now.getFullYear(), now.getMonth() + advance, 1)
  return {
    periodYear: target.getFullYear(),
    periodMonth: target.getMonth() + 1,
  }
}

function calculateNextGenerationDate(schedule: {
  frequencyType: string
  generationDay: number
}): string {
  const now = new Date()
  let next: Date

  switch (schedule.frequencyType) {
    case 'monthly':
      next = new Date(now.getFullYear(), now.getMonth() + 1, schedule.generationDay)
      break
    case 'quarterly':
      next = new Date(now.getFullYear(), now.getMonth() + 3, schedule.generationDay)
      break
    case 'semi_annual':
      next = new Date(now.getFullYear(), now.getMonth() + 6, schedule.generationDay)
      break
    case 'annual':
      next = new Date(now.getFullYear() + 1, now.getMonth(), schedule.generationDay)
      break
    default: // 'days' — use frequencyValue if available, fallback to generationDay
      next = new Date(now.getTime() + (schedule.generationDay * 24 * 60 * 60 * 1000))
      break
  }

  return next.toISOString().split('T')[0]!
}

async function markOverdueQuotas(quotasRepo: QuotasRepository, today: string): Promise<void> {
  try {
    const overdueQuotas = await quotasRepo.getOverdue(today)
    let markedCount = 0

    for (const quota of overdueQuotas) {
      if (quota.status === 'pending') {
        await quotasRepo.update(quota.id, { status: 'overdue' })
        markedCount++
      }
    }

    if (markedCount > 0) {
      logger.info({ count: markedCount }, '[QuotaGen Cron] Marked quotas as overdue')
    }
  } catch (error) {
    logger.error({ error }, '[QuotaGen Cron] Error marking overdue quotas')
  }
}

export function startQuotaGenerationCron(): void {
  logger.info('[QuotaGen Cron] Starting quota generation cron (every 1 hour)')

  // Don't run immediately on startup - wait for the first interval
  setInterval(runQuotaGeneration, ONE_HOUR_MS)
}
