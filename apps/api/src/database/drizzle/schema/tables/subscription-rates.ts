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
    userRate: decimal('user_rate', { precision: 10, scale: 2 }).notNull().default('0'),

    // Annual subscription discount (percentage)
    annualDiscountPercentage: decimal('annual_discount_percentage', { precision: 5, scale: 2 }).default('15').notNull(), // 15% default discount for annual subscriptions

    // Tiered pricing (volume-based)
    minCondominiums: integer('min_condominiums').default(1).notNull(),
    maxCondominiums: integer('max_condominiums'), // null = unlimited

    // Tax rate applied to invoices generated with this rate (e.g. 0.16 for 16% IVA)
    taxRate: decimal('tax_rate', { precision: 5, scale: 4 }),

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
    index('idx_rates_version').on(table.version), // Changed from uniqueIndex to regular index
    index('idx_rates_active').on(table.isActive),
    index('idx_rates_effective_from').on(table.effectiveFrom),
    index('idx_rates_name').on(table.name),
    index('idx_rates_tier').on(table.minCondominiums, table.maxCondominiums),
  ]
)
