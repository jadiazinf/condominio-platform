import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index, decimal } from 'drizzle-orm/pg-core'
import { condominiums } from './condominiums'
import { locations } from './locations'
import { users } from './users'
import { serviceProviderTypeEnum } from '../enums'

export const condominiumServices = pgTable(
  'condominium_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    providerType: serviceProviderTypeEnum('provider_type').notNull(),
    legalName: varchar('legal_name', { length: 255 }),
    taxIdType: varchar('tax_id_type', { length: 5 }),
    taxIdNumber: varchar('tax_id_number', { length: 50 }),
    email: varchar('email', { length: 255 }),
    phoneCountryCode: varchar('phone_country_code', { length: 10 }),
    phone: varchar('phone', { length: 50 }),
    address: varchar('address', { length: 500 }),
    locationId: uuid('location_id').references(() => locations.id, {
      onDelete: 'set null',
    }),
    // Tax configuration
    chargesIva: boolean('charges_iva').default(false).notNull(),
    ivaRate: decimal('iva_rate', { precision: 5, scale: 4 }).default('0.16').notNull(),
    subjectToIslarRetention: boolean('subject_to_islr_retention').default(false).notNull(),
    islrRetentionRate: decimal('islr_retention_rate', { precision: 5, scale: 4 }).default('0.01').notNull(),
    isDefault: boolean('is_default').default(false),
    isActive: boolean('is_active').default(true),
    metadata: jsonb('metadata'),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_condominium_services_condominium').on(table.condominiumId),
    index('idx_condominium_services_provider_type').on(table.providerType),
    index('idx_condominium_services_active').on(table.isActive),
    index('idx_condominium_services_created_by').on(table.createdBy),
  ]
)
