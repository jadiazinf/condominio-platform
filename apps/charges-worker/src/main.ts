import { env } from '@config/environment'
import { initSentry, Sentry } from '@config/sentry'
import { createBossClient } from '@worker/boss/client'
import {
  QUEUES,
  CRON_SCHEDULES,
  JOB_OPTIONS,
  type ICalculateInterestJobData,
  type INotifyJobData,
  type IPaymentRemindersJobData,
} from '@worker/boss/queues'
import { processBillingInterestCalculation } from '@worker/processors/billing-interest-calculation.processor'
import { processBillingPaymentReminders } from '@worker/processors/billing-payment-reminders.processor'
import { processNotification } from '@worker/processors/notification.processor'
import { DatabaseService } from '@database/service'
import logger from '@packages/logger'

async function waitForDatabase(url: string, maxRetries = 10, delayMs = 3000): Promise<void> {
  const { sql } = await import('drizzle-orm')
  DatabaseService.createInstance(url)

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const db = DatabaseService.getInstance().getDb()
      await db.execute(sql`SELECT 1`)
      logger.info(`[charges-worker] Database connection verified (attempt ${attempt})`)
      return
    } catch (_error) {
      if (attempt === maxRetries) {
        throw new Error(`Database not reachable after ${maxRetries} attempts`)
      }
      logger.warn(
        `[charges-worker] DB not ready (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`
      )
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
}

async function main() {
  initSentry()
  logger.info('[charges-worker] Starting...')

  await waitForDatabase(env.DATABASE_URL)

  const boss = await createBossClient(env.DATABASE_URL)
  await boss.start()
  logger.info('[charges-worker] pg-boss started')

  // Create queues (required before scheduling or sending jobs)
  for (const queueName of Object.values(QUEUES)) {
    await boss.createQueue(queueName)
  }
  logger.info('[charges-worker] Queues created')

  // Register job handlers
  await boss.work<ICalculateInterestJobData>(
    QUEUES.CALCULATE_INTEREST,
    { batchSize: 1 },
    async jobs => {
      for (const job of jobs) await processBillingInterestCalculation(job)
    }
  )
  await boss.work<INotifyJobData>(QUEUES.NOTIFY, { batchSize: 1 }, async jobs => {
    for (const job of jobs) await processNotification(job)
  })
  await boss.work<IPaymentRemindersJobData>(
    QUEUES.PAYMENT_REMINDERS,
    { batchSize: 1 },
    async jobs => {
      for (const job of jobs) await processBillingPaymentReminders(job)
    }
  )

  // Schedule cron jobs
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
  Sentry.captureException(error)
  logger.fatal({ error }, '[charges-worker] Fatal error during startup')
  process.exit(1)
})
