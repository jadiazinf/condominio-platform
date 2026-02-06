import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const subscriptionRates = pgTable(
  'subscription_rates',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Rate identification
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),

    // Pricing rates
    condominiumRate: decimal('condominium_rate', { precision: 10, scale: 2 }).notNull(),
    unitRate: decimal('unit_rate', { precision: 10, scale: 4 }).notNull(),

    // Tiered pricing (volume-based)
    minCondominiums: integer('min_condominiums').default(1).notNull(),
    maxCondominiums: integer('max_condominiums'), // null = unlimited

    // Versioning & Status
    version: varchar('version', { length: 50 }).notNull(),
    isActive: boolean('is_active').default(false).notNull(),
    effectiveFrom: timestamp('effective_from').notNull(),
    effectiveUntil: timestamp('effective_until'),

    // Audit fields
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    updatedBy: uuid('updated_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_rates_version_unique').on(table.version),
    index('idx_rates_active').on(table.isActive),
    index('idx_rates_effective_from').on(table.effectiveFrom),
    index('idx_rates_name').on(table.name),
    index('idx_rates_tier').on(table.minCondominiums, table.maxCondominiums),
  ]
)
