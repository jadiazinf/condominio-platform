import { z } from 'zod'
import { chargeSchema, EChargeStatuses } from './schema'

export type TCharge = z.infer<typeof chargeSchema>
export type TChargeStatus = (typeof EChargeStatuses)[number]
