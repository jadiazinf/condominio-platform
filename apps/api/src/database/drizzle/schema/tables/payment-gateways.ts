import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { condominiums } from './condominiums'
import { buildings } from './buildings'
import { gatewayTypeEnum } from '../enums'

export const paymentGateways = pgTable(
  'payment_gateways',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    gatewayType: gatewayTypeEnum('gateway_type').notNull(),
    configuration: jsonb('configuration'),
    supportedCurrencies: uuid('supported_currencies').array(),
    isActive: boolean('is_active').default(true),
    isSandbox: boolean('is_sandbox').default(false),
    metadata: jsonb('metadata'),
    registeredBy: uuid('registered_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_payment_gateways_type').on(table.gatewayType),
    index('idx_payment_gateways_active').on(table.isActive),
    index('idx_payment_gateways_registered_by').on(table.registeredBy),
  ]
)

export const entityPaymentGateways = pgTable(
  'entity_payment_gateways',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentGatewayId: uuid('payment_gateway_id')
      .notNull()
      .references(() => paymentGateways.id, { onDelete: 'cascade' }),
    condominiumId: uuid('condominium_id').references(() => condominiums.id, {
      onDelete: 'cascade',
    }),
    buildingId: uuid('building_id').references(() => buildings.id, {
      onDelete: 'cascade',
    }),
    entityConfiguration: jsonb('entity_configuration'),
    isActive: boolean('is_active').default(true),
    registeredBy: uuid('registered_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    index('idx_entity_gateways_gateway').on(table.paymentGatewayId),
    index('idx_entity_gateways_condominium').on(table.condominiumId),
    index('idx_entity_gateways_building').on(table.buildingId),
    index('idx_entity_gateways_registered_by').on(table.registeredBy),
  ]
)
