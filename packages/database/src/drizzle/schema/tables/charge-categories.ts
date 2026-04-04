import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  text,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'

export const chargeCategories = pgTable(
  'charge_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 50 }).notNull().unique(),
    description: text('description'),
    // i18n: { "es": "Ordinario", "en": "Ordinary" }
    labels: jsonb('labels').notNull().default('{}'),
    isSystem: boolean('is_system').default(false),
    isActive: boolean('is_active').default(true),
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_charge_categories_name').on(table.name),
    index('idx_charge_categories_active').on(table.isActive),
    index('idx_charge_categories_system').on(table.isSystem),
  ]
)
