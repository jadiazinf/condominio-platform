import { pgTable, uuid, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { bankAccounts } from './bank-accounts'
import { condominiums } from './condominiums'
import { users } from './users'

/**
 * Junction table for many-to-many relationship between bank accounts and condominiums.
 * When a bank account has appliesToAllCondominiums=true, no records are needed here.
 * When false, this table defines which specific condominiums the account serves.
 */
export const bankAccountCondominiums = pgTable(
  'bank_account_condominiums',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bankAccountId: uuid('bank_account_id')
      .notNull()
      .references(() => bankAccounts.id, { onDelete: 'cascade' }),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'cascade' }),
    assignedBy: uuid('assigned_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    assignedAt: timestamp('assigned_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    index('idx_bank_account_condo_bank_account').on(table.bankAccountId),
    index('idx_bank_account_condo_condominium').on(table.condominiumId),
    uniqueIndex('idx_bank_account_condo_unique').on(table.bankAccountId, table.condominiumId),
  ]
)
