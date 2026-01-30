import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { userSchema } from '../users/schema'

export const supportTicketAssignmentHistorySchema = baseModelSchema.extend({
  ticketId: z.uuid(),
  assignedTo: z.uuid(),
  assignedBy: z.uuid(),
  assignedAt: z.coerce.date(),
  unassignedAt: z.coerce.date().nullable(),
  isActive: z.boolean().default(true),

  // Relations
  assignedToUser: userSchema.optional(),
  assignedByUser: userSchema.optional(),
})

export const supportTicketAssignmentHistoryCreateSchema =
  supportTicketAssignmentHistorySchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })

export const supportTicketAssignmentHistoryUpdateSchema =
  supportTicketAssignmentHistorySchema.partial().omit({
    id: true,
    ticketId: true,
    createdAt: true,
  })
