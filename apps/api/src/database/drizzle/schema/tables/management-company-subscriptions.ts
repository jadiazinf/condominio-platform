import {
  pgTable,
  uuid,
  varchar,
  decimal,
  integer,
  jsonb,
  timestamp,
  boolean,
  text,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { managementCompanies } from './management-companies'
import { currencies } from './currencies'
import { users } from './users'
import { subscriptionStatusEnum, billingCycleEnum } from '../enums'

export const managementCompanySubscriptions = pgTable(
  'management_company_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    managementCompanyId: uuid('management_company_id')
      .notNull()
      .references(() => managementCompanies.id, { onDelete: 'cascade' }),

    // Personalización por administradora (no hay plantillas)
    subscriptionName: varchar('subscription_name', { length: 100 }),
    billingCycle: billingCycleEnum('billing_cycle').notNull(),
    basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
    currencyId: uuid('currency_id').references(() => currencies.id, {
      onDelete: 'restrict',
    }),

    // Límites personalizados (null = sin límite)
    maxCondominiums: integer('max_condominiums'),
    maxUsers: integer('max_users'),
    maxStorageGb: integer('max_storage_gb'),

    // Features/reglas personalizadas (JSONB flexible)
    customFeatures: jsonb('custom_features').$type<Record<string, boolean>>(),
    customRules: jsonb('custom_rules').$type<Record<string, unknown>>(),

    // Estado y fechas
    status: subscriptionStatusEnum('status').default('trial').notNull(),
    startDate: timestamp('start_date').defaultNow().notNull(),
    endDate: timestamp('end_date'),
    nextBillingDate: timestamp('next_billing_date'),
    trialEndsAt: timestamp('trial_ends_at'),
    autoRenew: boolean('auto_renew').default(true),

    // Metadata
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    cancelledAt: timestamp('cancelled_at'),
    cancelledBy: uuid('cancelled_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    cancellationReason: text('cancellation_reason'),
  },
  table => [
    index('idx_subscriptions_company').on(table.managementCompanyId),
    index('idx_subscriptions_status').on(table.status),
    index('idx_subscriptions_next_billing').on(table.nextBillingDate),
    index('idx_subscriptions_created_by').on(table.createdBy),
    // Solo puede haber una suscripción activa o trial por company
    uniqueIndex('idx_subscriptions_active_unique').on(table.managementCompanyId, table.status),
  ]
)
