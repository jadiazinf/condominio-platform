import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  decimal,
  text,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { buildings } from './buildings'
import { users } from './users'

export const units = pgTable(
  'units',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    buildingId: uuid('building_id')
      .notNull()
      .references(() => buildings.id, { onDelete: 'cascade' }),
    unitNumber: varchar('unit_number', { length: 50 }).notNull(),
    floor: integer('floor'),
    areaM2: decimal('area_m2', { precision: 10, scale: 2 }),
    bedrooms: integer('bedrooms'),
    bathrooms: integer('bathrooms'),
    parkingSpaces: integer('parking_spaces').default(0),
    parkingIdentifiers: text('parking_identifiers').array(),
    storageIdentifier: varchar('storage_identifier', { length: 50 }),
    aliquotPercentage: decimal('aliquot_percentage', {
      precision: 10,
      scale: 6,
    }),
    isActive: boolean('is_active').default(true),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_units_building').on(table.buildingId),
    index('idx_units_number').on(table.unitNumber),
    index('idx_units_active').on(table.isActive),
    index('idx_units_created_by').on(table.createdBy),
    uniqueIndex('idx_units_unique').on(table.buildingId, table.unitNumber),
  ]
)
