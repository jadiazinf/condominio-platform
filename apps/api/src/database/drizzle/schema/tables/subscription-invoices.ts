import {
  pgTable,
  uuid,
  varchar,
  decimal,
  jsonb,
  timestamp,
  text,
  index,
} from 'drizzle-orm/pg-core'
import { managementCompanySubscriptions } from './management-company-subscriptions'
import { managementCompanies } from './management-companies'
import { currencies } from './currencies'
import { payments } from './payments'
import { invoiceStatusEnum } from '../enums'

export const subscriptionInvoices = pgTable(
  'subscription_invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => managementCompanySubscriptions.id, { onDelete: 'restrict' }),
    managementCompanyId: uuid('management_company_id')
      .notNull()
      .references(() => managementCompanies.id, { onDelete: 'cascade' }),

    // Montos
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    currencyId: uuid('currency_id').references(() => currencies.id, {
      onDelete: 'restrict',
    }),
    taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0'),
    totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),

    // Estado y fechas
    status: invoiceStatusEnum('status').default('pending').notNull(),
    issueDate: timestamp('issue_date').defaultNow().notNull(),
    dueDate: timestamp('due_date').notNull(),
    paidDate: timestamp('paid_date'),

    // Pago asociado
    paymentId: uuid('payment_id').references(() => payments.id, {
      onDelete: 'set null',
    }),
    paymentMethod: varchar('payment_method', { length: 50 }),

    // Período de facturación
    billingPeriodStart: timestamp('billing_period_start').notNull(),
    billingPeriodEnd: timestamp('billing_period_end').notNull(),

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_invoices_subscription').on(table.subscriptionId),
    index('idx_invoices_company').on(table.managementCompanyId),
    index('idx_invoices_status').on(table.status),
    index('idx_invoices_due_date').on(table.dueDate),
    index('idx_invoices_number').on(table.invoiceNumber),
    index('idx_invoices_payment').on(table.paymentId),
  ]
)
