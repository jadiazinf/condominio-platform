import { z } from 'zod'
import { supportTicketSchema } from './schema'

export type TSupportTicket = z.infer<typeof supportTicketSchema>
