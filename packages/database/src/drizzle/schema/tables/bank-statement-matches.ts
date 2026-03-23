import { pgTable, uuid, decimal, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { bankStatementEntries } from './bank-statement-entries'
import { payments } from './payments'
import { users } from './users'
import { matchTypeEnum } from '../enums'

export const bankStatementMatches = pgTable(
  'bank_statement_matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entryId: uuid('entry_id')
      .notNull()
      .references(() => bankStatementEntries.id, { onDelete: 'cascade' }),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'restrict' }),
    matchType: matchTypeEnum('match_type').notNull(),
    confidence: decimal('confidence', { precision: 5, scale: 2 }),
    matchedBy: uuid('matched_by').references(() => users.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    uniqueIndex('idx_bank_statement_matches_entry_unique').on(table.entryId),
    index('idx_bank_statement_matches_payment').on(table.paymentId),
    index('idx_bank_statement_matches_type').on(table.matchType),
  ]
)
