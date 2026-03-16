import type PgBoss from 'pg-boss'
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
import { GenerateQuotasForScheduleService } from '@packages/services'
import { SYSTEM_USER_ID } from '@packages/domain'
import { getBossClient } from '@worker/boss/client'
import { QUEUES, type IAutoGenerateJobData, type INotifyJobData } from '@worker/boss/queues'
import logger from '@packages/logger'

export async function processAutoGeneration(job: PgBoss.Job<IAutoGenerateJobData>): Promise<void> {
  const start = Date.now()
  const { data } = job

  logger.info({ jobId: job.id, data }, '[AutoGen] Starting auto-generation')

  const db = DatabaseService.getInstance().getDb()
  const schedulesRepo = new QuotaGenerationSchedulesRepository(db)
  const rulesRepo = new QuotaGenerationRulesRepository(db)
  const formulasRepo = new QuotaFormulasRepository(db)
  const quotasRepo = new QuotasRepository(db)
  const logsRepo = new QuotaGenerationLogsRepository(db)
  const unitsRepo = new UnitsRepository(db)
  const buildingsRepo = new BuildingsRepository(db)

  const today = new Date().toISOString().split('T')[0]!

  // Get schedules to process
  let dueSchedules
  if (data?.scheduleId) {
    const schedule = await schedulesRepo.getById(data.scheduleId)
    dueSchedules = schedule ? [schedule] : []
  } else {
    dueSchedules = await schedulesRepo.getDueSchedules(today)
  }

  if (dueSchedules.length === 0) {
    logger.info('[AutoGen] No due schedules found')
    return
  }

  logger.info({ count: dueSchedules.length }, '[AutoGen] Processing due schedules')

  const service = new GenerateQuotasForScheduleService(
    db,
    quotasRepo,
    rulesRepo,
    formulasRepo,
    schedulesRepo,
    logsRepo,
    unitsRepo,
    buildingsRepo
  )

  let totalCreated = 0
  let totalFailed = 0
  const errors: string[] = []

  for (const schedule of dueSchedules) {
    try {
      const { periodYear, periodMonth } = calculateTargetPeriod(schedule.periodsInAdvance ?? 1)

      const result = await service.execute({
        scheduleId: schedule.id,
        periodYear,
        periodMonth,
        generatedBy: SYSTEM_USER_ID,
      })

      if (result.success) {
        totalCreated += result.data.quotasCreated
        totalFailed += result.data.quotasFailed

        logger.info(
          {
            scheduleId: schedule.id,
            quotasCreated: result.data.quotasCreated,
            quotasFailed: result.data.quotasFailed,
          },
          '[AutoGen] Schedule processed'
        )

        // Update schedule tracking
        const nextDate = calculateNextGenerationDate(schedule.frequencyType, schedule.generationDay)
        await schedulesRepo.updateAfterGeneration(schedule.id, {
          lastGeneratedPeriod: `${periodYear}-${String(periodMonth).padStart(2, '0')}`,
          lastGeneratedAt: new Date(),
          nextGenerationDate: nextDate,
        })
      } else {
        totalFailed++
        errors.push(`Schedule ${schedule.id}: ${result.error}`)
        logger.error({ scheduleId: schedule.id, error: result.error }, '[AutoGen] Schedule failed')
      }
    } catch (error) {
      totalFailed++
      const msg = error instanceof Error ? error.message : String(error)
      errors.push(`Schedule ${schedule.id}: ${msg}`)
      logger.error({ scheduleId: schedule.id, error }, '[AutoGen] Error processing schedule')
    }
  }

  // Mark overdue quotas (batch update instead of N+1)
  await markOverdueQuotas(quotasRepo, today)

  // Enqueue notification with results
  try {
    const boss = getBossClient()
    const notification: INotifyJobData = {
      userId: SYSTEM_USER_ID,
      category: totalFailed > 0 ? 'alert' : 'quota',
      title:
        totalFailed > 0 ? 'Auto-generation completed with errors' : 'Auto-generation completed',
      body: `Quotas created: ${totalCreated}. Failed: ${totalFailed}.`,
      data: { totalCreated, totalFailed, errors, schedulesProcessed: dueSchedules.length },
    }
    await boss.send(QUEUES.NOTIFY, notification)
  } catch (notifyError) {
    logger.error({ error: notifyError }, '[AutoGen] Failed to enqueue notification')
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  logger.info({ elapsedSeconds: elapsed, totalCreated, totalFailed }, '[AutoGen] Cycle completed')
}

function calculateTargetPeriod(periodsInAdvance: number): {
  periodYear: number
  periodMonth: number
} {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() + periodsInAdvance, 1)
  return {
    periodYear: target.getFullYear(),
    periodMonth: target.getMonth() + 1,
  }
}

function calculateNextGenerationDate(frequencyType: string, generationDay: number): string {
  const now = new Date()
  let next: Date

  switch (frequencyType) {
    case 'monthly':
      next = new Date(now.getFullYear(), now.getMonth() + 1, generationDay)
      break
    case 'quarterly':
      next = new Date(now.getFullYear(), now.getMonth() + 3, generationDay)
      break
    case 'semi_annual':
      next = new Date(now.getFullYear(), now.getMonth() + 6, generationDay)
      break
    case 'annual':
      next = new Date(now.getFullYear() + 1, now.getMonth(), generationDay)
      break
    default: // 'days'
      next = new Date(now.getTime() + generationDay * 24 * 60 * 60 * 1000)
      break
  }

  return next.toISOString().split('T')[0]!
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
