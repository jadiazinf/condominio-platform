import { z } from 'zod'
import { supportTicketSchema } from '../schema'

// Schema para actualizar un ticket de soporte
export const supportTicketUpdateSchema = supportTicketSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    ticketNumber: true,
    managementCompanyId: true,
    createdByUserId: true,
    createdByMemberId: true,
    managementCompany: true,
    createdByUser: true,
    createdByMember: true,
    resolvedByUser: true,
    closedByUser: true,
    currentAssignment: true,
    messages: true,
  })
  .partial()
  .strict()

export type TSupportTicketUpdate = z.infer<typeof supportTicketUpdateSchema>
