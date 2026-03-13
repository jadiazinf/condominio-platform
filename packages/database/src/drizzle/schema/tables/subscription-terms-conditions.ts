import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const subscriptionTermsConditions = pgTable(
  'subscription_terms_conditions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    version: varchar('version', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(), // Full T&C text in Markdown format
    summary: text('summary'), // Short description
    effectiveFrom: timestamp('effective_from').notNull(),
    effectiveUntil: timestamp('effective_until'),
    isActive: boolean('is_active').default(true).notNull(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_terms_version_unique').on(table.version),
    index('idx_terms_active').on(table.isActive),
    index('idx_terms_effective_from').on(table.effectiveFrom),
  ]
)
