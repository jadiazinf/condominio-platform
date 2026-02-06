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
import { subscriptionRates } from './subscription-rates'
import { subscriptionStatusEnum, billingCycleEnum, discountTypeEnum } from '../enums'

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

    // Pricing calculation data (stored for historical reference)
    pricingCondominiumCount: integer('pricing_condominium_count'),
    pricingUnitCount: integer('pricing_unit_count'),
    pricingCondominiumRate: decimal('pricing_condominium_rate', { precision: 10, scale: 2 }),
    pricingUnitRate: decimal('pricing_unit_rate', { precision: 10, scale: 4 }),
    calculatedPrice: decimal('calculated_price', { precision: 10, scale: 2 }),

    // Discount
    discountType: discountTypeEnum('discount_type'),
    discountValue: decimal('discount_value', { precision: 10, scale: 2 }),
    discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }),
    pricingNotes: text('pricing_notes'),

    // Reference to the rate used for this subscription
    rateId: uuid('rate_id').references(() => subscriptionRates.id, {
      onDelete: 'set null',
    }),

    // Límites personalizados (null = sin límite)
    maxCondominiums: integer('max_condominiums'),
    maxUnits: integer('max_units'),
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
    updatedBy: uuid('updated_by').references(() => users.id, {
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
    index('idx_subscriptions_rate').on(table.rateId),
    // Note: There is a partial unique index in the database (idx_subscriptions_active_unique)
    // that ensures only one active or trial subscription per company.
    // It's defined as: WHERE status IN ('active', 'trial')
    // This allows multiple cancelled/expired subscriptions per company.
    // Drizzle ORM doesn't support partial indexes in its DSL, so it's managed via migration.
  ]
)
