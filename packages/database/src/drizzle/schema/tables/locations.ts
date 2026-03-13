import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  index,
  foreignKey,
} from 'drizzle-orm/pg-core'
import { locationTypeEnum } from '../enums'

export const locations = pgTable(
  'locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    locationType: locationTypeEnum('location_type').notNull(),
    parentId: uuid('parent_id'),
    code: varchar('code', { length: 50 }),
    isActive: boolean('is_active').default(true),
    metadata: jsonb('metadata'),
    registeredBy: uuid('registered_by'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_locations_type').on(table.locationType),
    index('idx_locations_parent').on(table.parentId),
    index('idx_locations_code').on(table.code),
    index('idx_locations_name').on(table.name),
    index('idx_locations_active').on(table.isActive),
    index('idx_locations_registered_by').on(table.registeredBy),
    // Self-referencing foreign key
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'fk_locations_parent',
    }).onDelete('cascade'),
    // FK: registeredBy -> users.id (see migrations/0001_add_circular_foreign_keys.sql)
  ]
)
