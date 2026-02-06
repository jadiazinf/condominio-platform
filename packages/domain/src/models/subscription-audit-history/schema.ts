import { z } from 'zod'
import { managementCompanySubscriptionSchema } from '../management-company-subscriptions/schema'
import { userSchema } from '../users/schema'

// Subscription audit action options
export const ESubscriptionAuditAction = [
  'created',
  'activated',
  'deactivated',
  'updated',
  'cancelled',
  'renewed',
  'terms_accepted',
  'price_changed',
] as const

export const subscriptionAuditHistorySchema = z.object({
  id: z.uuid(),
  subscriptionId: z.uuid(),
  action: z.enum(ESubscriptionAuditAction),
  previousValues: z.record(z.string(), z.unknown()).nullable(),
  newValues: z.record(z.string(), z.unknown()).nullable(),
  changedFields: z.array(z.string()).nullable(),
  performedBy: z.uuid().nullable(),
  performedAt: z.coerce.date(),
  reason: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),

  // Relations
  subscription: managementCompanySubscriptionSchema.optional(),
  performedByUser: userSchema.optional(),
})
