import PgBoss from 'pg-boss'
import { env } from '@config/environment'
import logger from '@utils/logger'
import { QUEUES, JOB_OPTIONS, type IBulkGenerateJobData, type INotifyJobData } from './queues'

let boss: PgBoss | null = null

/**
 * Returns a send-only pg-boss client.
 * The API only enqueues jobs; the charges-worker processes them.
 */
async function getClient(): Promise<PgBoss> {
  if (boss) return boss

  boss = new PgBoss({
    connectionString: env.DATABASE_URL,
    // Send-only: no worker threads, minimal overhead
    schedule: false,
    supervise: false,
  })

  boss.on('error', error => {
    logger.error({ error }, '[pg-boss:api] Error')
  })

  await boss.start()
  logger.info('[pg-boss:api] Send-only client started')

  return boss
}

/**
 * Enqueue a bulk generation job.
 * Returns the pg-boss job ID for tracking.
 */
export async function enqueueBulkGeneration(data: IBulkGenerateJobData): Promise<string | null> {
  const client = await getClient()
  const jobId = await client.send(QUEUES.BULK_GENERATE, data, JOB_OPTIONS[QUEUES.BULK_GENERATE])
  logger.info(
    { jobId, paymentConceptId: data.paymentConceptId },
    '[pg-boss:api] Bulk generation job enqueued'
  )
  return jobId
}

/**
 * Enqueue a notification job.
 */
export async function enqueueNotification(data: INotifyJobData): Promise<string | null> {
  const client = await getClient()
  const jobId = await client.send(QUEUES.NOTIFY, data, JOB_OPTIONS[QUEUES.NOTIFY])
  return jobId
}

/**
 * Gracefully stop the send-only client.
 */
export async function stopBossClient(): Promise<void> {
  if (boss) {
    await boss.stop({ graceful: true })
    boss = null
  }
}
