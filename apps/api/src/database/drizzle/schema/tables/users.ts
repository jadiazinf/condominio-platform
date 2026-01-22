import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  foreignKey,
} from 'drizzle-orm/pg-core'
import { locations } from './locations'
import { currencies } from './currencies'

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firebaseUid: varchar('firebase_uid', { length: 128 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    displayName: varchar('display_name', { length: 255 }),
    phoneCountryCode: varchar('phone_country_code', { length: 10 }),
    phoneNumber: varchar('phone_number', { length: 50 }),
    photoUrl: text('photo_url'),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    idDocumentType: varchar('id_document_type', { length: 50 }),
    idDocumentNumber: varchar('id_document_number', { length: 50 }),
    address: varchar('address', { length: 500 }),
    locationId: uuid('location_id'),
    preferredLanguage: varchar('preferred_language', { length: 10 }).default('es'),
    preferredCurrencyId: uuid('preferred_currency_id'),
    isActive: boolean('is_active').default(true),
    isEmailVerified: boolean('is_email_verified').default(false),
    lastLogin: timestamp('last_login'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_users_firebase_uid').on(table.firebaseUid),
    index('idx_users_email').on(table.email),
    index('idx_users_location').on(table.locationId),
    index('idx_users_active').on(table.isActive),
    index('idx_users_id_document').on(table.idDocumentNumber),
    // Foreign keys to tables defined before users
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [locations.id],
      name: 'fk_users_location',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.preferredCurrencyId],
      foreignColumns: [currencies.id],
      name: 'fk_users_preferred_currency',
    }).onDelete('set null'),
  ]
)
