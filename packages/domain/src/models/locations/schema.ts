import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.locations

export const ELocationTypes = ['country', 'province', 'city'] as const

export const locationBaseSchema = baseModelSchema.extend({
  name: z.string({ error: d.name.required }).max(200, { error: d.name.max }),
  locationType: z.enum(ELocationTypes, { error: d.locationType.invalid }),
  parentId: z.uuid().nullable(),
  code: z.string().max(50, { error: d.code.max }).nullable(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  registeredBy: z.uuid().nullable(),
})

export type TLocationBase = z.infer<typeof locationBaseSchema>

export const locationSchema: z.ZodType<TLocationBase & { parent?: TLocationBase }> =
  locationBaseSchema.extend({
    parent: z.lazy(() => locationSchema).optional(),
  })
