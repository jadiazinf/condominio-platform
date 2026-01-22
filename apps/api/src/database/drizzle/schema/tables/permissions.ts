import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    description: text('description'),
    module: varchar('module', { length: 50 }).notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    registeredBy: uuid('registered_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_permissions_module').on(table.module),
    index('idx_permissions_registered_by').on(table.registeredBy),
    uniqueIndex('idx_permissions_module_action').on(table.module, table.action),
  ]
)
