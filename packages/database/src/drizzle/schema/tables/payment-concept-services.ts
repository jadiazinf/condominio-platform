import { pgTable, uuid, boolean, timestamp, decimal, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { paymentConcepts } from './payment-concepts'
import { condominiumServices } from './condominium-services'

export const paymentConceptServices = pgTable(
  'payment_concept_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentConceptId: uuid('payment_concept_id')
      .notNull()
      .references(() => paymentConcepts.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => condominiumServices.id, { onDelete: 'cascade' }),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    useDefaultAmount: boolean('use_default_amount').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_pcs_concept').on(table.paymentConceptId),
    index('idx_pcs_service').on(table.serviceId),
    uniqueIndex('idx_pcs_unique_concept_service').on(
      table.paymentConceptId,
      table.serviceId
    ),
  ]
)
