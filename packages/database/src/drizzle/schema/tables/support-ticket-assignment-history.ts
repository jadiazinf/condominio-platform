import { pgTable, uuid, timestamp, boolean } from 'drizzle-orm/pg-core'
import { users } from './users'
import { supportTickets } from './support-tickets'

/**
 * Support ticket assignment history table
 *
 * Tracks all assignment changes for support tickets, maintaining a complete audit trail.
 * When a ticket is reassigned, the previous assignment is marked as inactive (isActive = false)
 * and a new record is created for the new assignment.
 */
export const supportTicketAssignmentHistory = pgTable('support_ticket_assignment_history', {
  // Primary key
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign keys
  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => supportTickets.id, { onDelete: 'cascade' }),
  assignedTo: uuid('assigned_to')
    .notNull()
    .references(() => users.id),
  assignedBy: uuid('assigned_by')
    .notNull()
    .references(() => users.id),

  // Timestamps
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
  unassignedAt: timestamp('unassigned_at'),

  // Status
  isActive: boolean('is_active').notNull().default(true),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
