import { pgTable, uuid, varchar, boolean, timestamp, index } from 'drizzle-orm/pg-core'
import { condominiums } from './condominiums'
import { users } from './users'

export const condominiumAccessCodes = pgTable(
  'condominium_access_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 8 }).notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_access_codes_condominium').on(table.condominiumId),
    index('idx_access_codes_code').on(table.code),
    index('idx_access_codes_active').on(table.isActive),
    index('idx_access_codes_expires').on(table.expiresAt),
  ]
)
