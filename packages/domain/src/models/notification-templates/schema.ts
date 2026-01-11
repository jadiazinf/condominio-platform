import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { userSchema } from '../users/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.notificationTemplates

export const ENotificationCategories = [
  'payment',
  'quota',
  'announcement',
  'reminder',
  'alert',
  'system',
] as const

export const ENotificationChannels = ['in_app', 'email', 'push'] as const

export const notificationTemplateSchema = baseModelSchema.extend({
  code: z
    .string({ error: d.code.required })
    .min(1, { error: d.code.required })
    .max(100, { error: d.code.max }),
  name: z
    .string({ error: d.name.required })
    .min(1, { error: d.name.required })
    .max(255, { error: d.name.max }),
  category: z.enum(ENotificationCategories, { error: d.category.invalid }),
  subjectTemplate: z.string().max(500, { error: d.subjectTemplate.max }).nullable(),
  bodyTemplate: z.string({ error: d.bodyTemplate.required }),
  variables: z.array(z.string()).nullable(),
  defaultChannels: z.array(z.enum(ENotificationChannels)).default(['in_app']),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.uuid().nullable(),
  // Relations
  createdByUser: userSchema.optional(),
})
