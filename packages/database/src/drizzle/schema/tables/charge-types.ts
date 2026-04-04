import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core'
import { condominiums } from './condominiums'
import { chargeCategories } from './charge-categories'

export const chargeTypes = pgTable(
  'charge_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => chargeCategories.id),
    sortOrder: integer('sort_order').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_charge_types_condominium').on(table.condominiumId),
    index('idx_charge_types_category').on(table.categoryId),
    index('idx_charge_types_active').on(table.isActive),
  ]
)
