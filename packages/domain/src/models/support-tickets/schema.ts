import { z } from 'zod'
import { baseModelSchema } from '../../shared/base-model.schema'
import { managementCompanySchema } from '../management-companies/schema'
import { managementCompanyMemberSchema } from '../management-company-members/schema'
import { userSchema } from '../users/schema'

// Ticket priority options
export const ETicketPriority = ['low', 'medium', 'high', 'urgent'] as const

// Ticket status options
export const ETicketStatus = [
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
  'cancelled',
] as const

// Ticket category options
export const ETicketCategory = [
  'technical',
  'billing',
  'feature_request',
  'general',
  'bug',
] as const

export const supportTicketSchema = baseModelSchema.extend({
  ticketNumber: z.string().max(50),
  managementCompanyId: z.uuid(),
  createdByUserId: z.uuid(),
  createdByMemberId: z.uuid().nullable(),

  // Ticket information
  subject: z.string().max(255),
  description: z.string(),
  priority: z.enum(ETicketPriority).default('medium'),
  status: z.enum(ETicketStatus).default('open'),
  category: z.enum(ETicketCategory).nullable(),

  // Assignment (superadmin/support agent)
  assignedTo: z.uuid().nullable(),
  assignedAt: z.coerce.date().nullable(),

  // Tracking
  resolvedAt: z.coerce.date().nullable(),
  resolvedBy: z.uuid().nullable(),
  closedAt: z.coerce.date().nullable(),
  closedBy: z.uuid().nullable(),

  // Metadata
  metadata: z.record(z.string(), z.unknown()).nullable(),
  tags: z.array(z.string()).nullable(),

  // Relations
  managementCompany: managementCompanySchema.optional(),
  createdByUser: userSchema.optional(),
  createdByMember: managementCompanyMemberSchema.optional(),
  assignedToUser: userSchema.optional(),
  resolvedByUser: userSchema.optional(),
  closedByUser: userSchema.optional(),
  messages: z
    .lazy(() => {
      // Dynamic import to avoid circular dependency
      const { supportTicketMessageSchema } = require('../support-ticket-messages/schema')
      return z.array(supportTicketMessageSchema)
    })
    .optional(),
})

export type TTicketPriority = (typeof ETicketPriority)[number]
export type TTicketStatus = (typeof ETicketStatus)[number]
export type TTicketCategory = (typeof ETicketCategory)[number]
