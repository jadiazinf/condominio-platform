import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  integer,
  decimal,
} from 'drizzle-orm/pg-core'
import { condominiums } from './condominiums'
import { buildings } from './buildings'
import { currencies } from './currencies'
import { users } from './users'
import {
  channelTypeEnum,
  distributionMethodEnum,
  billingFrequencyEnum,
  generationStrategyEnum,
  feeTypeEnum,
  interestTypeEnum,
  allocationStrategyEnum,
  interestCapTypeEnum,
} from '../enums'

export const billingChannels = pgTable(
  'billing_channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'cascade' }),
    buildingId: uuid('building_id').references(() => buildings.id, {
      onDelete: 'cascade',
    }),
    name: varchar('name', { length: 200 }).notNull(),
    channelType: channelTypeEnum('channel_type').notNull(),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'restrict' }),
    managedBy: text('managed_by'),
    distributionMethod: distributionMethodEnum('distribution_method').notNull().default('by_aliquot'),
    frequency: billingFrequencyEnum('frequency').notNull().default('monthly'),
    generationStrategy: generationStrategyEnum('generation_strategy').notNull().default('manual'),
    generationDay: integer('generation_day').default(1),
    dueDay: integer('due_day').default(15),
    // Late payment surcharge
    latePaymentType: feeTypeEnum('late_payment_type').default('none'),
    latePaymentValue: decimal('late_payment_value', { precision: 10, scale: 4 }),
    gracePeriodDays: integer('grace_period_days').default(0),
    // Early payment discount
    earlyPaymentType: feeTypeEnum('early_payment_type').default('none'),
    earlyPaymentValue: decimal('early_payment_value', { precision: 10, scale: 4 }),
    earlyPaymentDaysBefore: integer('early_payment_days_before').default(0),
    // Interest configuration
    interestType: interestTypeEnum('interest_type').default('simple'),
    interestRate: decimal('interest_rate', { precision: 10, scale: 6 }),
    interestCalculationPeriod: varchar('interest_calculation_period', { length: 50 }),
    interestGracePeriodDays: integer('interest_grace_period_days').default(0),
    maxInterestCapType: interestCapTypeEnum('max_interest_cap_type').default('none'),
    maxInterestCapValue: decimal('max_interest_cap_value', { precision: 10, scale: 4 }),
    // Payment allocation
    allocationStrategy: allocationStrategyEnum('allocation_strategy').default('fifo'),
    // Legal
    assemblyReference: text('assembly_reference'),
    // State
    isActive: boolean('is_active').default(true),
    effectiveFrom: date('effective_from').notNull(),
    effectiveUntil: date('effective_until'),
    // Receipt number format (configurable per admin)
    receiptNumberFormat: varchar('receipt_number_format', { length: 100 }),
    metadata: jsonb('metadata'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_billing_channels_condominium').on(table.condominiumId),
    index('idx_billing_channels_building').on(table.buildingId),
    index('idx_billing_channels_type').on(table.channelType),
    index('idx_billing_channels_active').on(table.isActive),
    index('idx_billing_channels_created_by').on(table.createdBy),
  ]
)
