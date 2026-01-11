import { z } from 'zod'
import { quotaGenerationLogCreateSchema } from './createDto'

export type TQuotaGenerationLogCreate = z.infer<typeof quotaGenerationLogCreateSchema>
