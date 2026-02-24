import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
  decimal,
  date,
} from 'drizzle-orm/pg-core'
import { condominiumServices } from './condominium-services'
import { condominiums } from './condominiums'
import { currencies } from './currencies'
import { users } from './users'
import { paymentConcepts } from './payment-concepts'
import { serviceExecutionStatusEnum } from '../enums'

export const serviceExecutions = pgTable(
  'service_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => condominiumServices.id, { onDelete: 'cascade' }),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'cascade' }),
    paymentConceptId: uuid('payment_concept_id')
      .references(() => paymentConcepts.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    executionDate: date('execution_date').notNull(),
    totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull().default('0'),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'restrict' }),
    status: serviceExecutionStatusEnum('status').notNull().default('draft'),
    invoiceNumber: varchar('invoice_number', { length: 100 }),
    items: jsonb('items').default([]),
    attachments: jsonb('attachments').default([]),
    notes: text('notes'),
    metadata: jsonb('metadata'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_service_executions_service').on(table.serviceId),
    index('idx_service_executions_condominium').on(table.condominiumId),
    index('idx_service_executions_concept').on(table.paymentConceptId),
    index('idx_service_executions_date').on(table.executionDate),
    index('idx_service_executions_status').on(table.status),
  ]
)
