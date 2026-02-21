import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { managementCompanies } from './management-companies'
import { banks } from './banks'
import { users } from './users'
import { bankAccountCategoryEnum, bankPaymentMethodEnum } from '../enums'

/**
 * Bank accounts belonging to a management company.
 * Two categories: national (Venezuela) and international.
 * Soft-delete only (isActive flag) with full audit trail.
 * Type-specific details stored in accountDetails JSONB.
 */
export const bankAccounts = pgTable(
  'bank_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    managementCompanyId: uuid('management_company_id')
      .notNull()
      .references(() => managementCompanies.id, { onDelete: 'cascade' }),
    bankId: uuid('bank_id').references(() => banks.id, { onDelete: 'set null' }),
    accountCategory: bankAccountCategoryEnum('account_category').notNull(),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    bankName: varchar('bank_name', { length: 255 }).notNull(),
    accountHolderName: varchar('account_holder_name', { length: 255 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    accountDetails: jsonb('account_details').notNull(),
    acceptedPaymentMethods: bankPaymentMethodEnum('accepted_payment_methods')
      .array()
      .notNull(),
    appliesToAllCondominiums: boolean('applies_to_all_condominiums').default(false),
    isActive: boolean('is_active').default(true),
    notes: text('notes'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
    deactivatedBy: uuid('deactivated_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    deactivatedAt: timestamp('deactivated_at'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_bank_accounts_management_company').on(table.managementCompanyId),
    index('idx_bank_accounts_bank').on(table.bankId),
    index('idx_bank_accounts_category').on(table.accountCategory),
    index('idx_bank_accounts_active').on(table.isActive),
    index('idx_bank_accounts_created_by').on(table.createdBy),
  ]
)
