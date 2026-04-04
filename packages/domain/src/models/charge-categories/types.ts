import { z } from 'zod'
import { chargeCategorySchema, EChargeCategoryNames } from './schema'

export type TChargeCategory = z.infer<typeof chargeCategorySchema>
export type TChargeCategoryName = (typeof EChargeCategoryNames)[number]
