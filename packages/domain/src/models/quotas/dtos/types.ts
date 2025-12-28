import { z } from 'zod'
import { quotaCreateSchema } from './createDto'
import { quotaUpdateSchema } from './updateDto'

export type TQuotaCreate = z.infer<typeof quotaCreateSchema>
export type TQuotaUpdate = z.infer<typeof quotaUpdateSchema>
