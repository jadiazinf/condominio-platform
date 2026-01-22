import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  decimal,
  integer,
  date,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { condominiums } from './condominiums'
import { buildings } from './buildings'
import { paymentConcepts } from './payment-concepts'
import { currencies } from './currencies'
import { users } from './users'
import { interestTypeEnum } from '../enums'

export const interestConfigurations = pgTable(
  'interest_configurations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id').references(() => condominiums.id, {
      onDelete: 'cascade',
    }),
    buildingId: uuid('building_id').references(() => buildings.id, {
      onDelete: 'cascade',
    }),
    paymentConceptId: uuid('payment_concept_id').references(() => paymentConcepts.id, {
      onDelete: 'cascade',
    }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    interestType: interestTypeEnum('interest_type').notNull(),
    interestRate: decimal('interest_rate', { precision: 10, scale: 6 }),
    fixedAmount: decimal('fixed_amount', { precision: 15, scale: 2 }),
    calculationPeriod: varchar('calculation_period', { length: 50 }),
    gracePeriodDays: integer('grace_period_days').default(0),
    currencyId: uuid('currency_id').references(() => currencies.id, {
      onDelete: 'restrict',
    }),
    isActive: boolean('is_active').default(true),
    effectiveFrom: date('effective_from').notNull(),
    effectiveTo: date('effective_to'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_interest_configs_condominium').on(table.condominiumId),
    index('idx_interest_configs_building').on(table.buildingId),
    index('idx_interest_configs_concept').on(table.paymentConceptId),
    index('idx_interest_configs_active').on(table.isActive),
    index('idx_interest_configs_dates').on(table.effectiveFrom, table.effectiveTo),
    index('idx_interest_configs_created_by').on(table.createdBy),
  ]
)
