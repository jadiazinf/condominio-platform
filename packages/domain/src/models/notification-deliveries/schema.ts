import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { notificationSchema } from '../notifications/schema'
import { ENotificationChannels } from '../notification-templates/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.notificationDeliveries

export const EDeliveryStatuses = ['pending', 'sent', 'delivered', 'failed', 'bounced'] as const

export const notificationDeliverySchema = z.object({
  id: z.uuid(),
  notificationId: z.uuid({ error: d.notificationId.invalid }),
  channel: z.enum(ENotificationChannels, { error: d.channel.invalid }),
  status: z.enum(EDeliveryStatuses, { error: d.status.invalid }).default('pending'),
  sentAt: timestampField.nullable(),
  deliveredAt: timestampField.nullable(),
  failedAt: timestampField.nullable(),
  errorMessage: z.string().nullable(),
  retryCount: z.number().int().default(0),
  externalId: z.string().max(255).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: timestampField,
  // Relations
  notification: notificationSchema.optional(),
})
