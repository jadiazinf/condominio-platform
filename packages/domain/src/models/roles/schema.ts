import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.roles

export const roleSchema = baseModelSchema.extend({
  name: z.string({ error: d.name.required }).max(100, { error: d.name.max }),
  description: z.string().nullable(),
  isSystemRole: z.boolean().default(false),
  registeredBy: z.uuid().nullable(),
})
