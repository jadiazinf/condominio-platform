import { z } from 'zod'
import { chargeTypeSchema } from './schema'

export type TChargeType = z.infer<typeof chargeTypeSchema>
