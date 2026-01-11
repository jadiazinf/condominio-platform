import { z } from 'zod'
import { quotaAdjustmentCreateSchema } from './createDto'

export type TQuotaAdjustmentCreate = z.infer<typeof quotaAdjustmentCreateSchema>
