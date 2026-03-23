import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  date,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { bankAccounts } from './bank-accounts'
import { users } from './users'
import { bankStatementImportStatusEnum } from '../enums'

export const bankStatementImports = pgTable(
  'bank_statement_imports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bankAccountId: uuid('bank_account_id')
      .notNull()
      .references(() => bankAccounts.id, { onDelete: 'cascade' }),
    filename: varchar('filename', { length: 255 }).notNull(),
    importedBy: uuid('imported_by').references(() => users.id, { onDelete: 'set null' }),
    periodFrom: date('period_from').notNull(),
    periodTo: date('period_to').notNull(),
    totalEntries: integer('total_entries').default(0),
    totalCredits: decimal('total_credits', { precision: 15, scale: 2 }).default('0'),
    totalDebits: decimal('total_debits', { precision: 15, scale: 2 }).default('0'),
    status: bankStatementImportStatusEnum('status').default('processing'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_bank_statement_imports_bank_account').on(table.bankAccountId),
    index('idx_bank_statement_imports_status').on(table.status),
    index('idx_bank_statement_imports_imported_by').on(table.importedBy),
    index('idx_bank_statement_imports_period').on(table.periodFrom, table.periodTo),
  ]
)
