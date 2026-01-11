import { z } from 'zod'
import { EAdjustmentTypes, quotaAdjustmentSchema } from './schema'

export type TAdjustmentType = (typeof EAdjustmentTypes)[number]

export type TQuotaAdjustment = z.infer<typeof quotaAdjustmentSchema>
