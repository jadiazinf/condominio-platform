import PgBoss from 'pg-boss'
import logger from '@packages/logger'

let boss: PgBoss | null = null

export async function createBossClient(connectionString: string): Promise<PgBoss> {
  if (boss) return boss

  boss = new PgBoss({
    connectionString,
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
    archiveCompletedAfterSeconds: 60 * 60 * 24 * 7, // 7 days
    deleteAfterDays: 30,
    monitorStateIntervalMinutes: 5,
  })

  boss.on('error', error => {
    logger.error({ error }, '[pg-boss] Error')
  })

  boss.on('monitor-states', states => {
    logger.info({ states }, '[pg-boss] Queue states')
  })

  return boss
}

export function getBossClient(): PgBoss {
  if (!boss) {
    throw new Error('pg-boss client not initialized. Call createBossClient() first.')
  }
  return boss
}
