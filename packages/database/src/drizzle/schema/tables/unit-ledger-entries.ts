import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  index,
  decimal,
} from 'drizzle-orm/pg-core'
import { units } from './units'
import { billingChannels } from './billing-channels'
import { currencies } from './currencies'
import { exchangeRates } from './exchange-rates'
import { users } from './users'
import { ledgerEntryTypeEnum, ledgerReferenceTypeEnum } from '../enums'

export const unitLedgerEntries = pgTable(
  'unit_ledger_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    unitId: uuid('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    billingChannelId: uuid('billing_channel_id')
      .notNull()
      .references(() => billingChannels.id, { onDelete: 'cascade' }),
    entryDate: date('entry_date').notNull(),
    entryType: ledgerEntryTypeEnum('entry_type').notNull(),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'restrict' }),
    runningBalance: decimal('running_balance', { precision: 15, scale: 2 }).notNull(),
    description: text('description'),
    // Polymorphic reference
    referenceType: ledgerReferenceTypeEnum('reference_type').notNull(),
    referenceId: uuid('reference_id').notNull(),
    // Cross-currency payment info
    paymentAmount: decimal('payment_amount', { precision: 15, scale: 2 }),
    paymentCurrencyId: uuid('payment_currency_id').references(() => currencies.id, {
      onDelete: 'restrict',
    }),
    exchangeRateId: uuid('exchange_rate_id').references(() => exchangeRates.id, {
      onDelete: 'set null',
    }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    index('idx_ledger_unit_channel_date').on(table.unitId, table.billingChannelId, table.entryDate),
    index('idx_ledger_unit_channel_created').on(
      table.unitId,
      table.billingChannelId,
      table.createdAt
    ),
    index('idx_ledger_reference').on(table.referenceType, table.referenceId),
  ]
)
