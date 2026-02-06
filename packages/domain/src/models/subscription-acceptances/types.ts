import { z } from 'zod'
import { subscriptionAcceptanceSchema, EAcceptanceStatus } from './schema'

export type TAcceptanceStatus = (typeof EAcceptanceStatus)[number]
export type TSubscriptionAcceptance = z.infer<typeof subscriptionAcceptanceSchema>
