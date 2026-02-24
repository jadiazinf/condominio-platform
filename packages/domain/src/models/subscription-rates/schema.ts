import { z } from 'zod'
import { userSchema } from '../users/schema'

export const subscriptionRateSchema = z.object({
  id: z.uuid(),
  name: z.string().max(100),
  description: z.string().nullable(),
  condominiumRate: z.number().nonnegative(),
  unitRate: z.number().nonnegative(),
  userRate: z.number().nonnegative().default(0),

  // Annual subscription discount (percentage)
  annualDiscountPercentage: z.number().nonnegative().default(15), // 15% default discount for annual subscriptions

  // Tax rate applied to invoices (e.g. 0.16 = 16% IVA). Null means no tax.
  taxRate: z.number().min(0).max(1).nullable().optional(),

  // Tiered pricing (volume-based)
  minCondominiums: z.number().int().nonnegative().default(1),
  maxCondominiums: z.number().int().positive().nullable(), // null = unlimited

  version: z.string().max(50),
  isActive: z.boolean().default(false),
  effectiveFrom: z.coerce.date(),
  effectiveUntil: z.coerce.date().nullable(),
  createdBy: z.uuid().nullable(),
  updatedBy: z.uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),

  // Relations
  createdByUser: userSchema.optional(),
  updatedByUser: userSchema.optional(),
})
