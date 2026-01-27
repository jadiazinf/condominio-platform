import { z } from 'zod'
import { supportTicketMessageSchema } from './schema'

export type TSupportTicketMessage = z.infer<typeof supportTicketMessageSchema>
