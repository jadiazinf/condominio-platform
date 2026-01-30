import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core'
import { managementCompanies } from './management-companies'
import { managementCompanyMembers } from './management-company-members'
import { users } from './users'
import { ticketPriorityEnum, ticketStatusEnum, ticketCategoryEnum } from '../enums'

export const supportTickets = pgTable(
  'support_tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ticketNumber: varchar('ticket_number', { length: 50 }).notNull().unique(),
    managementCompanyId: uuid('management_company_id')
      .notNull()
      .references(() => managementCompanies.id, { onDelete: 'cascade' }),

    // Creador del ticket
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id),
    createdByMemberId: uuid('created_by_member_id').references(() => managementCompanyMembers.id),

    // Información del ticket
    subject: varchar('subject', { length: 255 }).notNull(),
    description: text('description').notNull(),
    priority: ticketPriorityEnum('priority').default('medium').notNull(),
    status: ticketStatusEnum('status').default('open').notNull(),
    category: ticketCategoryEnum('category'),

    // Asignación (superadmin/support agent)
    assignedTo: uuid('assigned_to').references(() => users.id),
    assignedAt: timestamp('assigned_at'),

    // Seguimiento
    resolvedAt: timestamp('resolved_at'),
    resolvedBy: uuid('resolved_by').references(() => users.id),
    closedAt: timestamp('closed_at'),
    closedBy: uuid('closed_by').references(() => users.id),

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    tags: text('tags').array(),

    // Status
    isActive: boolean('is_active').default(true).notNull(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_tickets_company').on(table.managementCompanyId),
    index('idx_tickets_created_by').on(table.createdByUserId),
    index('idx_tickets_status').on(table.status),
    index('idx_tickets_priority').on(table.priority),
    index('idx_tickets_assigned_to').on(table.assignedTo),
    index('idx_tickets_number').on(table.ticketNumber),
    index('idx_tickets_created_at').on(table.createdAt),
  ]
)
