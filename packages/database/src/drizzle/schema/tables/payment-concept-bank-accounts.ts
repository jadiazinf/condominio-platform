import { pgTable, uuid, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { paymentConcepts } from './payment-concepts'
import { bankAccounts } from './bank-accounts'
import { users } from './users'

export const paymentConceptBankAccounts = pgTable(
  'payment_concept_bank_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentConceptId: uuid('payment_concept_id')
      .notNull()
      .references(() => paymentConcepts.id, { onDelete: 'cascade' }),
    bankAccountId: uuid('bank_account_id')
      .notNull()
      .references(() => bankAccounts.id, { onDelete: 'cascade' }),
    assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    index('idx_pcba_concept').on(table.paymentConceptId),
    index('idx_pcba_bank_account').on(table.bankAccountId),
    uniqueIndex('idx_pcba_unique_link').on(table.paymentConceptId, table.bankAccountId),
  ]
)
