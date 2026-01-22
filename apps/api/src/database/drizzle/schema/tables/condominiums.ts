import { pgTable, uuid, varchar, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { locations } from './locations'
import { currencies } from './currencies'
import { users } from './users'
import { managementCompanies } from './management-companies'

export const condominiums = pgTable(
  'condominiums',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).unique(),
    managementCompanyId: uuid('management_company_id').references(() => managementCompanies.id, {
      onDelete: 'set null',
    }),
    address: varchar('address', { length: 500 }),
    locationId: uuid('location_id').references(() => locations.id, {
      onDelete: 'set null',
    }),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    defaultCurrencyId: uuid('default_currency_id').references(() => currencies.id, {
      onDelete: 'set null',
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
    index('idx_condominiums_name').on(table.name),
    index('idx_condominiums_code').on(table.code),
    index('idx_condominiums_management_company').on(table.managementCompanyId),
    index('idx_condominiums_location').on(table.locationId),
    index('idx_condominiums_active').on(table.isActive),
    index('idx_condominiums_created_by').on(table.createdBy),
  ]
)
