import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  integer,
  date,
  jsonb,
  index,
  check,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { units } from './units'
import { paymentConcepts } from './payment-concepts'
import { currencies } from './currencies'
import { users } from './users'
import { quotaStatusEnum, adjustmentTypeEnum } from '../enums'

export const quotas = pgTable(
  'quotas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    unitId: uuid('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    paymentConceptId: uuid('payment_concept_id')
      .notNull()
      .references(() => paymentConcepts.id, { onDelete: 'restrict' }),
    periodYear: integer('period_year').notNull(),
    periodMonth: integer('period_month'),
    periodDescription: varchar('period_description', { length: 100 }),
    baseAmount: decimal('base_amount', { precision: 15, scale: 2 }).notNull(),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'restrict' }),
    interestAmount: decimal('interest_amount', {
      precision: 15,
      scale: 2,
    }).default('0'),
    amountInBaseCurrency: decimal('amount_in_base_currency', {
      precision: 15,
      scale: 2,
    }),
    exchangeRateUsed: decimal('exchange_rate_used', {
      precision: 20,
      scale: 8,
    }),
    issueDate: date('issue_date').notNull(),
    dueDate: date('due_date').notNull(),
    status: quotaStatusEnum('status').default('pending'),
    paidAmount: decimal('paid_amount', { precision: 15, scale: 2 }).default('0'),
    balance: decimal('balance', { precision: 15, scale: 2 }).notNull(),
    notes: text('notes'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_quotas_unit').on(table.unitId),
    index('idx_quotas_concept').on(table.paymentConceptId),
    index('idx_quotas_period').on(table.periodYear, table.periodMonth),
    index('idx_quotas_status').on(table.status),
    index('idx_quotas_due_date').on(table.dueDate),
    index('idx_quotas_currency').on(table.currencyId),
    index('idx_quotas_created_by').on(table.createdBy),
  ]
)

export const quotaAdjustments = pgTable(
  'quota_adjustments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quotaId: uuid('quota_id')
      .notNull()
      .references(() => quotas.id, { onDelete: 'cascade' }),
    previousAmount: decimal('previous_amount', { precision: 15, scale: 2 }).notNull(),
    newAmount: decimal('new_amount', { precision: 15, scale: 2 }).notNull(),
    adjustmentType: adjustmentTypeEnum('adjustment_type').notNull(),
    reason: text('reason').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    index('idx_quota_adjustments_quota').on(table.quotaId),
    index('idx_quota_adjustments_created_by').on(table.createdBy),
    index('idx_quota_adjustments_type').on(table.adjustmentType),
    check('check_amount_changed', sql`previous_amount != new_amount`),
  ]
)
