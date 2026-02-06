import { z } from 'zod'
import { managementCompanySubscriptionSchema } from '../management-company-subscriptions/schema'
import { subscriptionTermsConditionsSchema } from '../subscription-terms-conditions/schema'
import { userSchema } from '../users/schema'

// Acceptance status options
export const EAcceptanceStatus = ['pending', 'accepted', 'expired', 'cancelled'] as const

export const subscriptionAcceptanceSchema = z.object({
  id: z.uuid(),
  subscriptionId: z.uuid(),
  termsConditionsId: z.uuid(),
  token: z.string().max(64), // For email verification
  tokenHash: z.string().max(64), // SHA-256 hash
  status: z.enum(EAcceptanceStatus).default('pending'),
  expiresAt: z.coerce.date(),
  acceptedBy: z.uuid().nullable(),
  acceptedAt: z.coerce.date().nullable(),
  acceptorEmail: z.string().email().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.coerce.date(),

  // Relations
  subscription: managementCompanySubscriptionSchema.optional(),
  termsConditions: subscriptionTermsConditionsSchema.optional(),
  acceptedByUser: userSchema.optional(),
})
