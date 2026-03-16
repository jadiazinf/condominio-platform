import { pgTable, uuid, varchar, timestamp, jsonb, index, integer, text } from 'drizzle-orm/pg-core'
import { payments } from './payments'
import { gatewayTypeEnum } from '../enums'

export const gatewayTransactions = pgTable(
  'gateway_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'cascade' }),
    gatewayType: gatewayTypeEnum('gateway_type').notNull(),
    externalTransactionId: varchar('external_transaction_id', { length: 255 }),
    externalReference: varchar('external_reference', { length: 255 }),
    requestPayload: jsonb('request_payload'),
    responsePayload: jsonb('response_payload'),
    status: varchar('status', { length: 50 }).notNull().default('initiated'),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(10),
    lastAttemptAt: timestamp('last_attempt_at'),
    verifiedAt: timestamp('verified_at'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_gateway_tx_payment').on(table.paymentId),
    index('idx_gateway_tx_external_id').on(table.externalTransactionId),
    index('idx_gateway_tx_external_ref').on(table.externalReference),
    index('idx_gateway_tx_status').on(table.status),
    index('idx_gateway_tx_type').on(table.gatewayType),
  ]
)
