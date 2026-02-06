import { z } from 'zod'
import { subscriptionAuditHistorySchema, ESubscriptionAuditAction } from './schema'

export type TSubscriptionAuditAction = (typeof ESubscriptionAuditAction)[number]
export type TSubscriptionAuditHistory = z.infer<typeof subscriptionAuditHistorySchema>
