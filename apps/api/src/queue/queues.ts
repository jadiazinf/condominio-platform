/**
 * Queue name constants and job payload types.
 * Mirrors the definitions in apps/charges-worker/src/boss/queues.ts.
 */

export const QUEUES = {
  AUTO_GENERATE: 'charges:auto-generate',
  BULK_GENERATE: 'charges:bulk-generate',
  CALCULATE_INTEREST: 'charges:calculate-interest',
  NOTIFY: 'charges:notify',
} as const

export interface IBulkGenerateJobData {
  paymentConceptId: string
  generatedBy: string
}

export interface INotifyJobData {
  userId: string
  category: 'quota' | 'alert'
  title: string
  body: string
  data?: Record<string, unknown>
}

export const JOB_OPTIONS = {
  [QUEUES.BULK_GENERATE]: {
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
    expireInMinutes: 60,
  },
  [QUEUES.NOTIFY]: {
    retryLimit: 3,
    retryDelay: 10,
    retryBackoff: true,
    expireInMinutes: 5,
  },
} as const
