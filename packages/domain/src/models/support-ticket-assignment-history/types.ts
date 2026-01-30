import { z } from 'zod'
import {
  supportTicketAssignmentHistorySchema,
  supportTicketAssignmentHistoryCreateSchema,
  supportTicketAssignmentHistoryUpdateSchema,
} from './schema'

export type TSupportTicketAssignmentHistory = z.infer<typeof supportTicketAssignmentHistorySchema>
export type TSupportTicketAssignmentHistoryCreate = z.infer<
  typeof supportTicketAssignmentHistoryCreateSchema
>
export type TSupportTicketAssignmentHistoryUpdate = z.infer<
  typeof supportTicketAssignmentHistoryUpdateSchema
>
