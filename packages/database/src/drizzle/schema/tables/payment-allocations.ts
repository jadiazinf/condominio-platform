import {
  pgTable,
  uuid,
  boolean,
  timestamp,
  decimal,
  unique,
  index,
} from 'drizzle-orm/pg-core'
import { payments } from './payments'
import { charges } from './charges'
import { users } from './users'

export const paymentAllocations = pgTable(
  'payment_allocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'cascade' }),
    chargeId: uuid('charge_id')
      .notNull()
      .references(() => charges.id, { onDelete: 'cascade' }),
    allocatedAmount: decimal('allocated_amount', { precision: 15, scale: 2 }).notNull(),
    allocatedAt: timestamp('allocated_at').defaultNow(),
    // Reversal tracking (for void receipt)
    reversed: boolean('reversed').default(false),
    reversedAt: timestamp('reversed_at'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  },
  table => [
    unique('uq_payment_allocation').on(table.paymentId, table.chargeId),
    index('idx_payment_allocations_payment').on(table.paymentId),
    index('idx_payment_allocations_charge').on(table.chargeId),
  ]
)
