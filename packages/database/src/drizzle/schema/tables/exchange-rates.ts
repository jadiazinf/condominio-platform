import {
  pgTable,
  uuid,
  varchar,
  boolean,
  decimal,
  date,
  timestamp,
  index,
  check,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { currencies } from './currencies'

export const exchangeRates = pgTable(
  'exchange_rates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromCurrencyId: uuid('from_currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'cascade' }),
    toCurrencyId: uuid('to_currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'cascade' }),
    rate: decimal('rate', { precision: 20, scale: 8 }).notNull(),
    effectiveDate: date('effective_date').notNull(),
    source: varchar('source', { length: 100 }),
    isActive: boolean('is_active').default(true),
    createdBy: uuid('created_by'),
    registeredBy: uuid('registered_by'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_exchange_rates_from').on(table.fromCurrencyId),
    index('idx_exchange_rates_to').on(table.toCurrencyId),
    index('idx_exchange_rates_date').on(table.effectiveDate),
    index('idx_exchange_rates_active').on(table.isActive),
    index('idx_exchange_rates_created_by').on(table.createdBy),
    index('idx_exchange_rates_registered_by').on(table.registeredBy),
    check('check_different_currencies', sql`from_currency_id != to_currency_id`),
    // FK: createdBy, registeredBy -> users.id (see migrations/0001_add_circular_foreign_keys.sql)
  ]
)
