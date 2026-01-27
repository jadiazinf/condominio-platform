import { z } from 'zod'
import { supportTicketMessageSchema } from '../schema'

// Schema para actualizar un mensaje de ticket
export const supportTicketMessageUpdateSchema = supportTicketMessageSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    ticketId: true,
    userId: true,
    user: true,
  })
  .partial()
  .strict()

export type TSupportTicketMessageUpdate = z.infer<typeof supportTicketMessageUpdateSchema>
