import { z } from 'zod'
import { EFrequencyTypes, quotaGenerationScheduleSchema } from './schema'

export type TFrequencyType = (typeof EFrequencyTypes)[number]

export type TQuotaGenerationSchedule = z.infer<typeof quotaGenerationScheduleSchema>
