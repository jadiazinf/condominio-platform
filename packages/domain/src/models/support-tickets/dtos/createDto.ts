import { z } from 'zod'
import { supportTicketSchema } from '../schema'

// Schema para crear un ticket de soporte
export const supportTicketCreateSchema = supportTicketSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    isActive: true,
    managementCompany: true,
    createdByUser: true,
    createdByMember: true,
    assignedToUser: true,
    resolvedByUser: true,
    closedByUser: true,
  })
  .strict()

export type TSupportTicketCreate = z.infer<typeof supportTicketCreateSchema>
