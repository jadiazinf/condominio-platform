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

  // Tracking
  resolvedAt: z.coerce.date().nullable(),
  resolvedBy: z.uuid().nullable(),
  solution: z.string().nullable(),
  closedAt: z.coerce.date().nullable(),
  closedBy: z.uuid().nullable(),

  // Metadata
  metadata: z.record(z.string(), z.unknown()).nullable(),
  tags: z.array(z.string()).nullable(),

  // Status
  isActive: z.boolean().default(true),

  // Relations
  managementCompany: managementCompanySchema.optional(),
  createdByUser: userSchema.optional(),
  createdByMember: managementCompanyMemberSchema.optional(),
  resolvedByUser: userSchema.optional(),
  closedByUser: userSchema.optional(),
  // Assignment history is handled in a separate table
  currentAssignment: z
    .object({
      assignedTo: z.uuid(),
      assignedToUser: userSchema.optional(),
      assignedAt: z.coerce.date(),
      assignedBy: z.uuid(),
      assignedByUser: userSchema.optional(),
    })
    .optional()
    .nullable(),
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
