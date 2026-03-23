import { pgTable, uuid, integer, text, date, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { bankAccounts } from './bank-accounts'
import { condominiums } from './condominiums'
import { users } from './users'
import { reconciliationStatusEnum } from '../enums'

export const bankReconciliations = pgTable(
  'bank_reconciliations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bankAccountId: uuid('bank_account_id')
      .notNull()
      .references(() => bankAccounts.id, { onDelete: 'restrict' }),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'restrict' }),
    periodFrom: date('period_from').notNull(),
    periodTo: date('period_to').notNull(),
    status: reconciliationStatusEnum('status').default('in_progress'),
    totalMatched: integer('total_matched').default(0),
    totalUnmatched: integer('total_unmatched').default(0),
    totalIgnored: integer('total_ignored').default(0),
    reconciledBy: uuid('reconciled_by').references(() => users.id, { onDelete: 'set null' }),
    reconciledAt: timestamp('reconciled_at'),
    notes: text('notes'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_bank_reconciliations_bank_account').on(table.bankAccountId),
    index('idx_bank_reconciliations_condominium').on(table.condominiumId),
    index('idx_bank_reconciliations_status').on(table.status),
    index('idx_bank_reconciliations_period').on(table.periodFrom, table.periodTo),
  ]
)
