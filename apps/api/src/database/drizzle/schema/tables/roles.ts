import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core'
import { users } from './users'

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    description: text('description'),
    isSystemRole: boolean('is_system_role').default(false),
    registeredBy: uuid('registered_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_roles_name').on(table.name),
    index('idx_roles_system').on(table.isSystemRole),
    index('idx_roles_registered_by').on(table.registeredBy),
  ]
)
