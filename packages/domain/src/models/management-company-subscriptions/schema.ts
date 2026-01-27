import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { managementCompanySchema } from '../management-companies/schema'
import { currencySchema } from '../currencies/schema'
import { userSchema } from '../users/schema'

// Subscription status options
export const ESubscriptionStatus = ['trial', 'active', 'inactive', 'cancelled', 'suspended'] as const

// Billing cycle options
export const EBillingCycle = ['monthly', 'quarterly', 'semi_annual', 'annual', 'custom'] as const

export const managementCompanySubscriptionSchema = baseModelSchema.extend({
  managementCompanyId: z.uuid(),

  // Personalización por administradora (no hay plantillas)
  subscriptionName: z.string().max(100).nullable(),
  billingCycle: z.enum(EBillingCycle),
  basePrice: z.number().positive(),
  currencyId: z.uuid().nullable(),

  // Límites personalizados (null = sin límite)
  maxCondominiums: z.number().int().positive().nullable(),
  maxUsers: z.number().int().positive().nullable(),
  maxStorageGb: z.number().int().positive().nullable(),

  // Features/reglas personalizadas (JSONB flexible)
  customFeatures: z.record(z.string(), z.boolean()).nullable(),
  customRules: z.record(z.string(), z.unknown()).nullable(),

  // Estado y fechas
  status: z.enum(ESubscriptionStatus).default('trial'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable(),
  nextBillingDate: z.coerce.date().nullable(),
  trialEndsAt: z.coerce.date().nullable(),
  autoRenew: z.boolean().default(true),

  // Metadata
  notes: z.string().nullable(),
  createdBy: z.uuid().nullable(),
  cancelledAt: z.coerce.date().nullable(),
  cancelledBy: z.uuid().nullable(),
  cancellationReason: z.string().nullable(),

  // Relations
  managementCompany: managementCompanySchema.optional(),
  currency: currencySchema.optional(),
  createdByUser: userSchema.optional(),
  cancelledByUser: userSchema.optional(),
})
