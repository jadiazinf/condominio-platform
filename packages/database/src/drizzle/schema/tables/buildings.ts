import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { condominiums } from './condominiums'
import { users } from './users'

export const buildings = pgTable(
  'buildings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }),
    address: varchar('address', { length: 500 }),
    floorsCount: integer('floors_count'),
    unitsCount: integer('units_count'),
    bankAccountHolder: varchar('bank_account_holder', { length: 255 }),
    bankName: varchar('bank_name', { length: 100 }),
    bankAccountNumber: varchar('bank_account_number', { length: 100 }),
    bankAccountType: varchar('bank_account_type', { length: 50 }),
    isActive: boolean('is_active').default(true),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_buildings_condominium').on(table.condominiumId),
    index('idx_buildings_name').on(table.name),
    index('idx_buildings_active').on(table.isActive),
    index('idx_buildings_created_by').on(table.createdBy),
    uniqueIndex('idx_buildings_code_unique').on(table.condominiumId, table.code),
  ]
)
