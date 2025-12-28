import { z } from 'zod'
import { EQuotaStatuses, quotaSchema } from './schema'

export type TQuotaStatus = (typeof EQuotaStatuses)[number]

export type TQuota = z.infer<typeof quotaSchema>
