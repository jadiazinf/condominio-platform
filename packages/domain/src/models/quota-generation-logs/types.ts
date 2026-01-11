import { z } from 'zod'
import { EGenerationMethods, EGenerationStatuses, quotaGenerationLogSchema } from './schema'

export type TGenerationMethod = (typeof EGenerationMethods)[number]
export type TGenerationStatus = (typeof EGenerationStatuses)[number]

export type TQuotaGenerationLog = z.infer<typeof quotaGenerationLogSchema>
