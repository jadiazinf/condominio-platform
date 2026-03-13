import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  date,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { units } from './units'
import { currencies } from './currencies'
import { paymentGateways } from './payment-gateways'
import { quotas } from './quotas'
import { paymentMethodEnum, paymentStatusEnum } from '../enums'

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentNumber: varchar('payment_number', { length: 100 }).unique(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    unitId: uuid('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'restrict' }),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'restrict' }),
    paidAmount: decimal('paid_amount', { precision: 15, scale: 2 }),
    paidCurrencyId: uuid('paid_currency_id').references(() => currencies.id, {
      onDelete: 'restrict',
    }),
    exchangeRate: decimal('exchange_rate', { precision: 20, scale: 8 }),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    paymentGatewayId: uuid('payment_gateway_id').references(() => paymentGateways.id, {
      onDelete: 'set null',
    }),
    paymentDetails: jsonb('payment_details'),
    paymentDate: date('payment_date').notNull(),
    registeredAt: timestamp('registered_at').defaultNow(),
    status: paymentStatusEnum('status').default('completed'),
    receiptUrl: text('receipt_url'),
    receiptNumber: varchar('receipt_number', { length: 100 }),
    notes: text('notes'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    registeredBy: uuid('registered_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    verifiedBy: uuid('verified_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    verifiedAt: timestamp('verified_at'),
    verificationNotes: text('verification_notes'),
  },
  table => [
    index('idx_payments_user').on(table.userId),
    index('idx_payments_unit').on(table.unitId),
    index('idx_payments_date').on(table.paymentDate),
    index('idx_payments_status').on(table.status),
    index('idx_payments_number').on(table.paymentNumber),
    index('idx_payments_gateway').on(table.paymentGatewayId),
    index('idx_payments_currency').on(table.currencyId),
    index('idx_payments_registered_by').on(table.registeredBy),
    index('idx_payments_verified_by').on(table.verifiedBy),
  ]
)

export const paymentApplications = pgTable(
  'payment_applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'cascade' }),
    quotaId: uuid('quota_id')
      .notNull()
      .references(() => quotas.id, { onDelete: 'cascade' }),
    appliedAmount: decimal('applied_amount', {
      precision: 15,
      scale: 2,
    }).notNull(),
    appliedToPrincipal: decimal('applied_to_principal', {
      precision: 15,
      scale: 2,
    }).default('0'),
    appliedToInterest: decimal('applied_to_interest', {
      precision: 15,
      scale: 2,
    }).default('0'),
    registeredBy: uuid('registered_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    appliedAt: timestamp('applied_at').defaultNow(),
  },
  table => [
    index('idx_payment_applications_payment').on(table.paymentId),
    index('idx_payment_applications_quota').on(table.quotaId),
    index('idx_payment_applications_registered_by').on(table.registeredBy),
    uniqueIndex('idx_payment_applications_unique').on(table.paymentId, table.quotaId),
  ]
)
