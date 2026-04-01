import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  jsonb,
  index,
  integer,
  decimal,
  unique,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { billingChannels } from './billing-channels'
import { units } from './units'
import { currencies } from './currencies'
import { users } from './users'
import { billingReceiptStatusEnum } from '../enums'

export const receipts = pgTable(
  'receipts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    billingChannelId: uuid('billing_channel_id')
      .notNull()
      .references(() => billingChannels.id, { onDelete: 'cascade' }),
    unitId: uuid('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    // Period
    periodYear: integer('period_year').notNull(),
    periodMonth: integer('period_month').notNull(),
    // Serial (unique, NEVER reused — Art. 14 LPH fuerza ejecutiva)
    receiptNumber: varchar('receipt_number', { length: 50 }).notNull().unique(),
    status: billingReceiptStatusEnum('status').notNull().default('draft'),
    issuedAt: timestamp('issued_at'),
    dueDate: date('due_date'),
    // Amount breakdown
    subtotal: decimal('subtotal', { precision: 15, scale: 2 }).default('0'),
    reserveFundAmount: decimal('reserve_fund_amount', { precision: 15, scale: 2 }).default('0'),
    previousBalance: decimal('previous_balance', { precision: 15, scale: 2 }).default('0'),
    interestAmount: decimal('interest_amount', { precision: 15, scale: 2 }).default('0'),
    lateFeeAmount: decimal('late_fee_amount', { precision: 15, scale: 2 }).default('0'),
    discountAmount: decimal('discount_amount', { precision: 15, scale: 2 }).default('0'),
    totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'restrict' }),
    // Void & replacement chain
    replacesReceiptId: uuid('replaces_receipt_id'),
    voidReason: text('void_reason'),
    // Links
    budgetId: uuid('budget_id'),
    pdfUrl: text('pdf_url'),
    notes: text('notes'),
    metadata: jsonb('metadata'),
    generatedBy: uuid('generated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_receipts_channel').on(table.billingChannelId),
    index('idx_receipts_unit').on(table.unitId),
    index('idx_receipts_period').on(table.periodYear, table.periodMonth),
    index('idx_receipts_status').on(table.status),
    index('idx_receipts_generated_by').on(table.generatedBy),
  ]
)
