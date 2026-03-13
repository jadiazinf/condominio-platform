import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { condominiums } from './condominiums'
import { users } from './users'

export const amenities = pgTable(
  'amenities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    location: varchar('location', { length: 255 }),
    capacity: integer('capacity'),
    requiresApproval: boolean('requires_approval').default(false),
    reservationRules: jsonb('reservation_rules'),
    isActive: boolean('is_active').default(true),
    metadata: jsonb('metadata'),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_amenities_condominium').on(table.condominiumId),
    index('idx_amenities_name').on(table.name),
    index('idx_amenities_active').on(table.isActive),
    index('idx_amenities_created_by').on(table.createdBy),
  ]
)
