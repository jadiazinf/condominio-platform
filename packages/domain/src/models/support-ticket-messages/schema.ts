import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { userSchema } from '../users/schema'

// Attachment schema
export const attachmentSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  size: z.number().positive(),
  mimeType: z.string().optional(),
})

export const supportTicketMessageSchema = baseModelSchema.extend({
  ticketId: z.uuid(),
  userId: z.uuid(),

  // Message content
  message: z.string(),
  isInternal: z.boolean().default(false),

  // Attachments
  attachments: z.array(attachmentSchema).nullable(),

  // Relations
  user: userSchema.optional(),
})

export type TAttachment = z.infer<typeof attachmentSchema>
