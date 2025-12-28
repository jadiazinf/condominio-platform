import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { userSchema } from '../users/schema'
import { condominiumSchema } from '../condominiums/schema'
import { buildingSchema } from '../buildings/schema'
import { unitSchema } from '../units/schema'

export const ERecipientTypes = ['user', 'condominium', 'building', 'unit'] as const

export const EMessageTypes = ['message', 'notification', 'announcement'] as const

export const EMessagePriorities = ['low', 'normal', 'high', 'urgent'] as const

export const messageSchema = z.object({
  id: z.uuid(),
  senderId: z.uuid(),
  recipientType: z.enum(ERecipientTypes),
  recipientUserId: z.uuid().nullable(),
  recipientCondominiumId: z.uuid().nullable(),
  recipientBuildingId: z.uuid().nullable(),
  recipientUnitId: z.uuid().nullable(),
  subject: z.string().max(255).nullable(),
  body: z.string(),
  messageType: z.enum(EMessageTypes).default('message'),
  priority: z.enum(EMessagePriorities).default('normal'),
  attachments: z.record(z.string(), z.unknown()).nullable(),
  isRead: z.boolean().default(false),
  readAt: timestampField.nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  registeredBy: z.uuid().nullable(),
  sentAt: timestampField,
  // Relations
  sender: userSchema.optional(),
  recipientUser: userSchema.optional(),
  recipientCondominium: condominiumSchema.optional(),
  recipientBuilding: buildingSchema.optional(),
  recipientUnit: unitSchema.optional(),
})
