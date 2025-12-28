import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'

export const ELocationTypes = ['country', 'province', 'city'] as const

export const locationBaseSchema = baseModelSchema.extend({
  name: z.string().max(200),
  locationType: z.enum(ELocationTypes),
  parentId: z.uuid().nullable(),
  code: z.string().max(50).nullable(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  registeredBy: z.uuid().nullable(),
})

export type TLocationBase = z.infer<typeof locationBaseSchema>

export const locationSchema: z.ZodType<TLocationBase & { parent?: TLocationBase }> =
  locationBaseSchema.extend({
    parent: z.lazy(() => locationSchema).optional(),
  })
