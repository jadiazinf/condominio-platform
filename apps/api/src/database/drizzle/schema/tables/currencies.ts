import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core'

export const currencies = pgTable(
  'currencies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 10 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    symbol: varchar('symbol', { length: 10 }),
    isBaseCurrency: boolean('is_base_currency').default(false),
    isActive: boolean('is_active').default(true),
    decimals: integer('decimals').default(2),
    registeredBy: uuid('registered_by'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_currencies_code').on(table.code),
    index('idx_currencies_active').on(table.isActive),
    index('idx_currencies_registered_by').on(table.registeredBy),
    // FK: registeredBy -> users.id (see migrations/0001_add_circular_foreign_keys.sql)
  ]
)
