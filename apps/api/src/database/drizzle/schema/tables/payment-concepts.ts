import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { condominiums } from './condominiums'
import { buildings } from './buildings'
import { currencies } from './currencies'
import { users } from './users'
import { conceptTypeEnum } from '../enums'

export const paymentConcepts = pgTable(
  'payment_concepts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id').references(() => condominiums.id, {
      onDelete: 'cascade',
    }),
    buildingId: uuid('building_id').references(() => buildings.id, {
      onDelete: 'cascade',
    }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    conceptType: conceptTypeEnum('concept_type').notNull(),
    isRecurring: boolean('is_recurring').default(true),
    recurrencePeriod: varchar('recurrence_period', { length: 50 }),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'restrict' }),
    isActive: boolean('is_active').default(true),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_payment_concepts_condominium').on(table.condominiumId),
    index('idx_payment_concepts_building').on(table.buildingId),
    index('idx_payment_concepts_type').on(table.conceptType),
    index('idx_payment_concepts_active').on(table.isActive),
    index('idx_payment_concepts_created_by').on(table.createdBy),
  ]
)
