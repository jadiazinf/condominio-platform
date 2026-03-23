import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  date,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { bankStatementImports } from './bank-statement-imports'
import { bankStatementEntryTypeEnum, bankStatementEntryStatusEnum } from '../enums'

export const bankStatementEntries = pgTable(
  'bank_statement_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    importId: uuid('import_id')
      .notNull()
      .references(() => bankStatementImports.id, { onDelete: 'cascade' }),
    transactionDate: date('transaction_date').notNull(),
    valueDate: date('value_date'),
    reference: varchar('reference', { length: 255 }),
    description: text('description'),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    entryType: bankStatementEntryTypeEnum('entry_type').notNull(),
    balance: decimal('balance', { precision: 15, scale: 2 }),
    status: bankStatementEntryStatusEnum('status').default('unmatched'),
    matchedAt: timestamp('matched_at'),
    rawData: jsonb('raw_data'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_bank_statement_entries_import').on(table.importId),
    index('idx_bank_statement_entries_date').on(table.transactionDate),
    index('idx_bank_statement_entries_reference').on(table.reference),
    index('idx_bank_statement_entries_status').on(table.status),
    index('idx_bank_statement_entries_type').on(table.entryType),
  ]
)
