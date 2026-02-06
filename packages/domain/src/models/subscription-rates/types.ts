import { z } from 'zod'
import { subscriptionRateSchema } from './schema'

export type TSubscriptionRate = z.infer<typeof subscriptionRateSchema>
