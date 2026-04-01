import { z } from 'zod'
import { chargeTypeSchema, EChargeCategories } from './schema'

export type TChargeType = z.infer<typeof chargeTypeSchema>
export type TChargeCategory = (typeof EChargeCategories)[number]
