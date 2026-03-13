import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { bankAccountCategoryEnum, bankPaymentMethodEnum } from '../enums'

/**
 * Banks catalog table.
 * Reference data for banks, queryable by country and category.
 * Seeded with Venezuelan banks and optionally international banks.
 */
export const banks = pgTable(
  'banks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 20 }),
    swiftCode: varchar('swift_code', { length: 11 }),
    country: varchar('country', { length: 2 }).notNull(),
    accountCategory: bankAccountCategoryEnum('account_category').notNull(),
    supportedPaymentMethods: bankPaymentMethodEnum('supported_payment_methods').array(),
    logoUrl: text('logo_url'),
    isActive: boolean('is_active').default(true),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_banks_country').on(table.country),
    index('idx_banks_account_category').on(table.accountCategory),
    index('idx_banks_active').on(table.isActive),
    index('idx_banks_code').on(table.code),
    uniqueIndex('idx_banks_code_country').on(table.code, table.country),
  ]
)
