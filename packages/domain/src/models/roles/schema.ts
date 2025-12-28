import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'

export const roleSchema = baseModelSchema.extend({
  name: z.string().max(100),
  description: z.string().nullable(),
  isSystemRole: z.boolean().default(false),
  registeredBy: z.uuid().nullable(),
})
