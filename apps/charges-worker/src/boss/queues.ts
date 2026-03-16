/**
 * Queue name constants and job type definitions for pg-boss.
 * Shared between the worker (consumer) and the API (producer).
 */

export const QUEUES = {
  AUTO_GENERATE: 'charges:auto-generate',
  BULK_GENERATE: 'charges:bulk-generate',
  CALCULATE_INTEREST: 'charges:calculate-interest',
  NOTIFY: 'charges:notify',
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Job payload types
// ─────────────────────────────────────────────────────────────────────────────

export interface IAutoGenerateJobData {
  /** When triggered manually, process only this schedule. Otherwise processes all due schedules. */
  scheduleId?: string
}

export interface IBulkGenerateJobData {
  paymentConceptId: string
  generatedBy: string
}

export interface ICalculateInterestJobData {
  /** When provided, only calculate for this condominium. Otherwise processes all. */
  condominiumId?: string
}

export interface INotifyJobData {
  userId: string
  category: 'quota' | 'alert'
  title: string
  body: string
  data?: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Retry / scheduling defaults
// ─────────────────────────────────────────────────────────────────────────────

export const JOB_OPTIONS = {
  [QUEUES.AUTO_GENERATE]: {
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
    expireInMinutes: 30,
    singletonKey: 'auto-generate-singleton',
  },
  [QUEUES.BULK_GENERATE]: {
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
    expireInMinutes: 60,
  },
  [QUEUES.CALCULATE_INTEREST]: {
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
    expireInMinutes: 30,
    singletonKey: 'calculate-interest-singleton',
  },
  [QUEUES.NOTIFY]: {
    retryLimit: 3,
    retryDelay: 10,
    retryBackoff: true,
    expireInMinutes: 15,
  },
} as const

export const CRON_SCHEDULES = {
  /** Daily at 2:00 AM UTC */
  AUTO_GENERATE: '0 2 * * *',
  /** Daily at 3:00 AM UTC */
  CALCULATE_INTEREST: '0 3 * * *',
} as const
