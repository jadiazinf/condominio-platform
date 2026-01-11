import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { userSchema } from '../users/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.userFcmTokens

export const EDevicePlatforms = ['web', 'ios', 'android'] as const

export const userFcmTokenSchema = baseModelSchema.extend({
  userId: z.uuid({ error: d.userId.invalid }),
  token: z
    .string({ error: d.token.required })
    .min(1, { error: d.token.required })
    .max(500, { error: d.token.max }),
  platform: z.enum(EDevicePlatforms, { error: d.platform.invalid }),
  deviceName: z.string().max(255, { error: d.deviceName.max }).nullable(),
  isActive: z.boolean().default(true),
  lastUsedAt: z.date().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  // Relations
  user: userSchema.optional(),
})
