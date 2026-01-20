import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'

export const superadminUserSchema = baseModelSchema.extend({
  userId: z.string().uuid(),
  notes: z.string().nullable(),
  isActive: z.boolean().default(true),
  lastAccessAt: z.date().nullable(),
  createdBy: z.string().uuid().nullable(),
})
