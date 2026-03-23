import { env } from '@config/environment'
import { createBossClient } from '@worker/boss/client'
import {
  QUEUES,
  CRON_SCHEDULES,
  JOB_OPTIONS,
  type IAutoGenerateJobData,
  type IBulkGenerateJobData,
  type ICalculateInterestJobData,
  type INotifyJobData,
  type IPaymentRemindersJobData,
} from '@worker/boss/queues'
import { processAutoGeneration } from '@worker/processors/auto-generation.processor'
import { processBulkGeneration } from '@worker/processors/bulk-generation.processor'
import { processInterestCalculation } from '@worker/processors/interest-calculation.processor'
import { processNotification } from '@worker/processors/notification.processor'
import { processPaymentReminders } from '@worker/processors/payment-reminders.processor'
import { DatabaseService } from '@database/service'
import logger from '@packages/logger'

async function main() {
  logger.info('[charges-worker] Starting...')

  DatabaseService.createInstance(env.DATABASE_URL)

  const boss = await createBossClient(env.DATABASE_URL)
  await boss.start()
  logger.info('[charges-worker] pg-boss started')

  // Create queues (required before scheduling or sending jobs)
  for (const queueName of Object.values(QUEUES)) {
    await boss.createQueue(queueName)
  }
  logger.info('[charges-worker] Queues created')

  // Register job handlers (pg-boss v10 passes Job[] batches; batchSize:1 for sequential processing)
  await boss.work<IAutoGenerateJobData>(QUEUES.AUTO_GENERATE, { batchSize: 1 }, async jobs => {
    for (const job of jobs) await processAutoGeneration(job)
  })
  await boss.work<IBulkGenerateJobData>(QUEUES.BULK_GENERATE, { batchSize: 1 }, async jobs => {
    for (const job of jobs) await processBulkGeneration(job)
  })
  await boss.work<ICalculateInterestJobData>(
    QUEUES.CALCULATE_INTEREST,
    { batchSize: 1 },
    async jobs => {
      for (const job of jobs) await processInterestCalculation(job)
    }
  )
  await boss.work<INotifyJobData>(QUEUES.NOTIFY, { batchSize: 1 }, async jobs => {
    for (const job of jobs) await processNotification(job)
  })
  await boss.work<IPaymentRemindersJobData>(
    QUEUES.PAYMENT_REMINDERS,
    { batchSize: 1 },
    async jobs => {
      for (const job of jobs) await processPaymentReminders(job)
    }
  )

  // Schedule cron jobs
  await boss.schedule(
    QUEUES.AUTO_GENERATE,
    CRON_SCHEDULES.AUTO_GENERATE,
    {},
    { ...JOB_OPTIONS[QUEUES.AUTO_GENERATE] }
  )
  await boss.schedule(
    QUEUES.CALCULATE_INTEREST,
    CRON_SCHEDULES.CALCULATE_INTEREST,
    {},
    { ...JOB_OPTIONS[QUEUES.CALCULATE_INTEREST] }
  )
  await boss.schedule(
    QUEUES.PAYMENT_REMINDERS,
    CRON_SCHEDULES.PAYMENT_REMINDERS,
    {},
    { ...JOB_OPTIONS[QUEUES.PAYMENT_REMINDERS] }
  )

  logger.info('[charges-worker] All handlers registered and cron jobs scheduled')

  // NOTE: No startup triggers — rely on cron schedules only.
  // Auto-generation and interest calculation run on their configured schedules.
  // Triggering on every restart caused duplicate notifications and unnecessary processing.

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`[charges-worker] Received ${signal}, shutting down gracefully...`)
    await boss.stop({ graceful: true, timeout: 30_000 })
    logger.info('[charges-worker] Shutdown complete')
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch(error => {
  logger.fatal({ error }, '[charges-worker] Fatal error during startup')
  process.exit(1)
})
