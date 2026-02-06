import { z } from 'zod'
import { userSchema } from '../users/schema'

export const subscriptionTermsConditionsSchema = z.object({
  id: z.uuid(),
  version: z.string().max(50),
  title: z.string().max(255),
  content: z.string(), // Full T&C text in Markdown format
  summary: z.string().nullable(),
  effectiveFrom: z.coerce.date(),
  effectiveUntil: z.coerce.date().nullable(),
  isActive: z.boolean().default(true),
  createdBy: z.uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),

  // Relations
  createdByUser: userSchema.optional(),
})
