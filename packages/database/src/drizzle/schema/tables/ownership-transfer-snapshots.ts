import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  jsonb,
  index,
  decimal,
} from 'drizzle-orm/pg-core'
import { units } from './units'
import { users } from './users'
import { currencies } from './currencies'

export const ownershipTransferSnapshots = pgTable(
  'ownership_transfer_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    unitId: uuid('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    previousOwnerId: uuid('previous_owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    newOwnerId: uuid('new_owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    transferDate: date('transfer_date').notNull(),
    // { channelId: { balance, currency, pendingCharges } }
    balanceSnapshot: jsonb('balance_snapshot').notNull(),
    totalDebt: decimal('total_debt', { precision: 15, scale: 2 }).default('0'),
    debtCurrencyId: uuid('debt_currency_id').references(() => currencies.id, {
      onDelete: 'restrict',
    }),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    index('idx_transfer_snapshots_unit').on(table.unitId),
    index('idx_transfer_snapshots_date').on(table.transferDate),
  ]
)
