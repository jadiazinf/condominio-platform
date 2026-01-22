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
import { locations } from './locations'
import { users } from './users'

export const managementCompanies = pgTable(
  'management_companies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    legalName: varchar('legal_name', { length: 255 }),
    taxId: varchar('tax_id', { length: 100 }).unique(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    website: varchar('website', { length: 255 }),
    address: varchar('address', { length: 500 }),
    locationId: uuid('location_id').references(() => locations.id, {
      onDelete: 'set null',
    }),
    isActive: boolean('is_active').default(true),
    logoUrl: text('logo_url'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_management_companies_name').on(table.name),
    index('idx_management_companies_tax_id').on(table.taxId),
    index('idx_management_companies_active').on(table.isActive),
    index('idx_management_companies_created_by').on(table.createdBy),
  ]
)
