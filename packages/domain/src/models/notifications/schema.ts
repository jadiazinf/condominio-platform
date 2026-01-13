import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { userSchema } from '../users/schema'
import {
  notificationTemplateSchema,
  ENotificationCategories,
} from '../notification-templates/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.notifications

export const EPriorities = ['low', 'normal', 'high', 'urgent'] as const

export const notificationSchema = z.object({
  id: z.uuid(),
  userId: z.uuid({ error: d.userId.invalid }),
  templateId: z.uuid().nullable(),
  category: z.enum(ENotificationCategories, { error: d.category.invalid }),
  title: z
    .string({ error: d.title.required })
    .min(1, { error: d.title.required })
    .max(255, { error: d.title.max }),
  body: z.string({ error: d.body.required }),
  priority: z.enum(EPriorities, { error: d.priority.invalid }).default('normal'),
  data: z.record(z.string(), z.unknown()).nullable(),
  isRead: z.boolean().default(false),
  readAt: timestampField.nullable(),
  expiresAt: timestampField.nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: timestampField,
  // Relations
  user: userSchema.optional(),
  template: notificationTemplateSchema.optional(),
})
