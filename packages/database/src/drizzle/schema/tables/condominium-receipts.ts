import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  timestamp,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { condominiums } from './condominiums'
import { buildings } from './buildings'
import { units } from './units'
import { currencies } from './currencies'
import { budgets } from './budgets'
import { receiptStatusEnum } from '../enums'

// ─────────────────────────────────────────────────────────────────────────────
// Condominium Receipts (Recibo de Condominio)
// ─────────────────────────────────────────────────────────────────────────────

export const condominiumReceipts = pgTable(
  'condominium_receipts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'cascade' }),
    buildingId: uuid('building_id')
      .notNull()
      .references(() => buildings.id, { onDelete: 'cascade' }),
    unitId: uuid('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    budgetId: uuid('budget_id').references(() => budgets.id, { onDelete: 'set null' }),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'restrict' }),

    // Period
    periodYear: integer('period_year').notNull(),
    periodMonth: integer('period_month').notNull(),

    // Receipt identification
    receiptNumber: varchar('receipt_number', { length: 50 }).notNull(),
    status: receiptStatusEnum('status').notNull().default('draft'),

    // Amounts breakdown
    ordinaryAmount: decimal('ordinary_amount', { precision: 15, scale: 2 }).notNull().default('0'),
    extraordinaryAmount: decimal('extraordinary_amount', { precision: 15, scale: 2 })
      .notNull()
      .default('0'),
    reserveFundAmount: decimal('reserve_fund_amount', { precision: 15, scale: 2 })
      .notNull()
      .default('0'),
    interestAmount: decimal('interest_amount', { precision: 15, scale: 2 }).notNull().default('0'),
    finesAmount: decimal('fines_amount', { precision: 15, scale: 2 }).notNull().default('0'),
    previousBalance: decimal('previous_balance', { precision: 15, scale: 2 })
      .notNull()
      .default('0'),
    totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull().default('0'),

    // Unit info snapshot (for historical accuracy)
    unitAliquot: decimal('unit_aliquot', { precision: 8, scale: 5 }),

    // PDF
    pdfUrl: text('pdf_url'),

    // Timestamps
    generatedAt: timestamp('generated_at'),
    sentAt: timestamp('sent_at'),
    voidedAt: timestamp('voided_at'),

    // Audit
    notes: text('notes'),
    metadata: jsonb('metadata'),
    generatedBy: uuid('generated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_receipts_condominium').on(table.condominiumId),
    index('idx_receipts_unit').on(table.unitId),
    index('idx_receipts_period').on(table.periodYear, table.periodMonth),
    index('idx_receipts_status').on(table.status),
    unique('uq_receipts_unit_period').on(table.unitId, table.periodYear, table.periodMonth),
  ]
)
