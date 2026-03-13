import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { paymentConcepts } from './payment-concepts'
import { condominiums } from './condominiums'
import { users } from './users'

export const paymentConceptChanges = pgTable(
  'payment_concept_changes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentConceptId: uuid('payment_concept_id')
      .notNull()
      .references(() => paymentConcepts.id, { onDelete: 'cascade' }),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'cascade' }),
    changedBy: uuid('changed_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    previousValues: jsonb('previous_values').notNull(),
    newValues: jsonb('new_values').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    index('idx_pcc_concept').on(table.paymentConceptId),
    index('idx_pcc_condominium').on(table.condominiumId),
    index('idx_pcc_changed_by').on(table.changedBy),
  ]
)
