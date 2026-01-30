import { z } from 'zod'
import { supportTicketMessageSchema } from '../schema'

// Schema para crear un mensaje de ticket
export const supportTicketMessageCreateSchema = supportTicketMessageSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    isActive: true,
    user: true,
  })
  .strict()

export type TSupportTicketMessageCreate = z.infer<typeof supportTicketMessageCreateSchema>
