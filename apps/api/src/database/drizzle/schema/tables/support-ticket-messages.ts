import { pgTable, uuid, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core'
import { supportTickets } from './support-tickets'
import { users } from './users'

export const supportTicketMessages = pgTable(
  'support_ticket_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => supportTickets.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),

    // Message content
    message: text('message').notNull(),
    isInternal: boolean('is_internal').default(false).notNull(),

    // Attachments
    attachments: jsonb('attachments').$type<
      Array<{
        name: string
        url: string
        size: number
        mimeType?: string
      }>
    >(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_ticket_messages_ticket').on(table.ticketId),
    index('idx_ticket_messages_user').on(table.userId),
    index('idx_ticket_messages_created_at').on(table.createdAt),
  ]
)
