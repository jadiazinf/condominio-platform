import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { userSchema } from '../users/schema'
import { ENotificationCategories, ENotificationChannels } from '../notification-templates/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.userNotificationPreferences

export const userNotificationPreferenceSchema = baseModelSchema.extend({
  userId: z.uuid({ error: d.userId.invalid }),
  category: z.enum(ENotificationCategories, { error: d.category.invalid }),
  channel: z.enum(ENotificationChannels, { error: d.channel.invalid }),
  isEnabled: z.boolean().default(true),
  quietHoursStart: z.string().nullable(), // TIME format: "22:00"
  quietHoursEnd: z.string().nullable(), // TIME format: "08:00"
  metadata: z.record(z.string(), z.unknown()).nullable(),
  // Relations
  user: userSchema.optional(),
})
