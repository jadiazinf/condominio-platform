import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'

export const chargeTypeSchema = baseModelSchema.extend({
  condominiumId: z.uuid(),
  name: z.string().min(1).max(200),
  categoryId: z.uuid(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
})
