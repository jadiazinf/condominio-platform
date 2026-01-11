import { z } from 'zod'
import { quotaGenerationScheduleCreateSchema } from './createDto'
import { quotaGenerationScheduleUpdateSchema } from './updateDto'

export type TQuotaGenerationScheduleCreate = z.infer<typeof quotaGenerationScheduleCreateSchema>
export type TQuotaGenerationScheduleUpdate = z.infer<typeof quotaGenerationScheduleUpdateSchema>
