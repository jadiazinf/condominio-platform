import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  decimal,
  date,
  jsonb,
  inet,
  uniqueIndex,
  index,
  check,
  pgEnum,
  foreignKey,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// ============================================================================
// ENUMS
// ============================================================================

export const locationTypeEnum = pgEnum('location_type', ['country', 'province', 'city'])

export const ownershipTypeEnum = pgEnum('ownership_type', ['owner', 'co-owner', 'tenant'])

export const conceptTypeEnum = pgEnum('concept_type', [
  'maintenance',
  'condominium_fee',
  'extraordinary',
  'fine',
])

export const interestTypeEnum = pgEnum('interest_type', ['simple', 'compound', 'fixed_amount'])

export const quotaStatusEnum = pgEnum('quota_status', ['pending', 'paid', 'overdue', 'cancelled'])

export const gatewayTypeEnum = pgEnum('gateway_type', [
  'stripe',
  'banco_plaza',
  'paypal',
  'zelle',
  'other',
])

export const paymentMethodEnum = pgEnum('payment_method', ['transfer', 'cash', 'card', 'gateway'])

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'pending_verification',
  'completed',
  'failed',
  'refunded',
  'rejected',
])

export const expenseStatusEnum = pgEnum('expense_status', [
  'pending',
  'approved',
  'rejected',
  'paid',
])

export const documentTypeEnum = pgEnum('document_type', [
  'invoice',
  'receipt',
  'statement',
  'contract',
  'regulation',
  'minutes',
  'other',
])

export const recipientTypeEnum = pgEnum('recipient_type', [
  'user',
  'condominium',
  'building',
  'unit',
])

export const messageTypeEnum = pgEnum('message_type', ['message', 'notification', 'announcement'])

export const priorityEnum = pgEnum('priority', ['low', 'normal', 'high', 'urgent'])

export const auditActionEnum = pgEnum('audit_action', ['INSERT', 'UPDATE', 'DELETE'])

// Notification enums
export const notificationCategoryEnum = pgEnum('notification_category', [
  'payment',
  'quota',
  'announcement',
  'reminder',
  'alert',
  'system',
])

export const notificationChannelEnum = pgEnum('notification_channel', ['in_app', 'email', 'push'])

export const devicePlatformEnum = pgEnum('device_platform', ['web', 'ios', 'android'])

export const deliveryStatusEnum = pgEnum('delivery_status', [
  'pending',
  'sent',
  'delivered',
  'failed',
  'bounced',
])

// ============================================================================
// MÓDULO: LOCACIONES (País/Provincia/Ciudad)
// ============================================================================

export const locations = pgTable(
  'locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    locationType: locationTypeEnum('location_type').notNull(),
    parentId: uuid('parent_id'),
    code: varchar('code', { length: 50 }),
    isActive: boolean('is_active').default(true),
    metadata: jsonb('metadata'),
    registeredBy: uuid('registered_by'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_locations_type').on(table.locationType),
    index('idx_locations_parent').on(table.parentId),
    index('idx_locations_code').on(table.code),
    index('idx_locations_name').on(table.name),
    index('idx_locations_active').on(table.isActive),
    index('idx_locations_registered_by').on(table.registeredBy),
    // Self-referencing foreign key
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'fk_locations_parent',
    }).onDelete('cascade'),
    // FK: registeredBy -> users.id (see migrations/0001_add_circular_foreign_keys.sql)
  ]
)

// ============================================================================
// MÓDULO: MONEDAS Y TASAS DE CAMBIO
// ============================================================================

export const currencies = pgTable(
  'currencies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 10 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    symbol: varchar('symbol', { length: 10 }),
    isBaseCurrency: boolean('is_base_currency').default(false),
    isActive: boolean('is_active').default(true),
    decimals: integer('decimals').default(2),
    registeredBy: uuid('registered_by'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_currencies_code').on(table.code),
    index('idx_currencies_active').on(table.isActive),
    index('idx_currencies_registered_by').on(table.registeredBy),
    // FK: registeredBy -> users.id (see migrations/0001_add_circular_foreign_keys.sql)
  ]
)

export const exchangeRates = pgTable(
  'exchange_rates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromCurrencyId: uuid('from_currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'cascade' }),
    toCurrencyId: uuid('to_currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'cascade' }),
    rate: decimal('rate', { precision: 20, scale: 8 }).notNull(),
    effectiveDate: date('effective_date').notNull(),
    source: varchar('source', { length: 100 }),
    createdBy: uuid('created_by'),
    registeredBy: uuid('registered_by'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    index('idx_exchange_rates_from').on(table.fromCurrencyId),
    index('idx_exchange_rates_to').on(table.toCurrencyId),
    index('idx_exchange_rates_date').on(table.effectiveDate),
    index('idx_exchange_rates_created_by').on(table.createdBy),
    index('idx_exchange_rates_registered_by').on(table.registeredBy),
    uniqueIndex('idx_exchange_rates_unique').on(
      table.fromCurrencyId,
      table.toCurrencyId,
      table.effectiveDate
    ),
    check('check_different_currencies', sql`from_currency_id != to_currency_id`),
    // FK: createdBy, registeredBy -> users.id (see migrations/0001_add_circular_foreign_keys.sql)
  ]
)

// ============================================================================
// MÓDULO: AUTENTICACIÓN Y USUARIOS
// ============================================================================

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firebaseUid: varchar('firebase_uid', { length: 128 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    displayName: varchar('display_name', { length: 255 }),
    phoneNumber: varchar('phone_number', { length: 50 }),
    photoUrl: text('photo_url'),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    idDocumentType: varchar('id_document_type', { length: 50 }),
    idDocumentNumber: varchar('id_document_number', { length: 50 }),
    address: varchar('address', { length: 500 }),
    locationId: uuid('location_id'),
    preferredLanguage: varchar('preferred_language', { length: 10 }).default('es'),
    preferredCurrencyId: uuid('preferred_currency_id'),
    isActive: boolean('is_active').default(true),
    isEmailVerified: boolean('is_email_verified').default(false),
    lastLogin: timestamp('last_login'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_users_firebase_uid').on(table.firebaseUid),
    index('idx_users_email').on(table.email),
    index('idx_users_location').on(table.locationId),
    index('idx_users_active').on(table.isActive),
    index('idx_users_id_document').on(table.idDocumentNumber),
    // Foreign keys to tables defined before users
    foreignKey({
      columns: [table.locationId],
      foreignColumns: [locations.id],
      name: 'fk_users_location',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.preferredCurrencyId],
      foreignColumns: [currencies.id],
      name: 'fk_users_preferred_currency',
    }).onDelete('set null'),
  ]
)

// ============================================================================
// MÓDULO: PERMISOS Y ROLES
// ============================================================================

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    description: text('description'),
    module: varchar('module', { length: 50 }).notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    registeredBy: uuid('registered_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_permissions_module').on(table.module),
    index('idx_permissions_registered_by').on(table.registeredBy),
    uniqueIndex('idx_permissions_module_action').on(table.module, table.action),
  ]
)

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    description: text('description'),
    isSystemRole: boolean('is_system_role').default(false),
    registeredBy: uuid('registered_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_roles_name').on(table.name),
    index('idx_roles_system').on(table.isSystemRole),
    index('idx_roles_registered_by').on(table.registeredBy),
  ]
)

export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    registeredBy: uuid('registered_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    index('idx_role_permissions_role').on(table.roleId),
    index('idx_role_permissions_permission').on(table.permissionId),
    index('idx_role_permissions_registered_by').on(table.registeredBy),
    uniqueIndex('idx_role_permissions_unique').on(table.roleId, table.permissionId),
  ]
)

// ============================================================================
// MÓDULO: COMPAÑÍAS ADMINISTRADORAS
// ============================================================================

export const managementCompanies = pgTable(
  'management_companies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    legalName: varchar('legal_name', { length: 255 }),
    taxId: varchar('tax_id', { length: 100 }).unique(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    website: varchar('website', { length: 255 }),
    address: varchar('address', { length: 500 }),
    locationId: uuid('location_id').references(() => locations.id, {
      onDelete: 'set null',
    }),
    isActive: boolean('is_active').default(true),
    logoUrl: text('logo_url'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_management_companies_name').on(table.name),
    index('idx_management_companies_tax_id').on(table.taxId),
    index('idx_management_companies_active').on(table.isActive),
    index('idx_management_companies_created_by').on(table.createdBy),
  ]
)

// ============================================================================
// MÓDULO: CONDOMINIOS Y EDIFICIOS
// ============================================================================

export const condominiums = pgTable(
  'condominiums',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).unique(),
    managementCompanyId: uuid('management_company_id').references(() => managementCompanies.id, {
      onDelete: 'set null',
    }),
    address: varchar('address', { length: 500 }),
    locationId: uuid('location_id').references(() => locations.id, {
      onDelete: 'set null',
    }),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    defaultCurrencyId: uuid('default_currency_id').references(() => currencies.id, {
      onDelete: 'set null',
    }),
    isActive: boolean('is_active').default(true),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_condominiums_name').on(table.name),
    index('idx_condominiums_code').on(table.code),
    index('idx_condominiums_management_company').on(table.managementCompanyId),
    index('idx_condominiums_location').on(table.locationId),
    index('idx_condominiums_active').on(table.isActive),
    index('idx_condominiums_created_by').on(table.createdBy),
  ]
)

export const buildings = pgTable(
  'buildings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }),
    address: varchar('address', { length: 500 }),
    floorsCount: integer('floors_count'),
    unitsCount: integer('units_count'),
    bankAccountHolder: varchar('bank_account_holder', { length: 255 }),
    bankName: varchar('bank_name', { length: 100 }),
    bankAccountNumber: varchar('bank_account_number', { length: 100 }),
    bankAccountType: varchar('bank_account_type', { length: 50 }),
    isActive: boolean('is_active').default(true),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_buildings_condominium').on(table.condominiumId),
    index('idx_buildings_name').on(table.name),
    index('idx_buildings_active').on(table.isActive),
    index('idx_buildings_created_by').on(table.createdBy),
    uniqueIndex('idx_buildings_code_unique').on(table.condominiumId, table.code),
  ]
)

// User roles (defined after condominiums and buildings)
export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    condominiumId: uuid('condominium_id').references(() => condominiums.id, {
      onDelete: 'cascade',
    }),
    buildingId: uuid('building_id').references(() => buildings.id, {
      onDelete: 'cascade',
    }),
    assignedAt: timestamp('assigned_at').defaultNow(),
    assignedBy: uuid('assigned_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    registeredBy: uuid('registered_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    expiresAt: timestamp('expires_at'),
  },
  table => [
    index('idx_user_roles_user').on(table.userId),
    index('idx_user_roles_role').on(table.roleId),
    index('idx_user_roles_condominium').on(table.condominiumId),
    index('idx_user_roles_building').on(table.buildingId),
    index('idx_user_roles_assigned_by').on(table.assignedBy),
    index('idx_user_roles_registered_by').on(table.registeredBy),
    uniqueIndex('idx_user_roles_unique').on(
      table.userId,
      table.roleId,
      table.condominiumId,
      table.buildingId
    ),
  ]
)

// ============================================================================
// MÓDULO: UNIDADES
// ============================================================================

export const units = pgTable(
  'units',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    buildingId: uuid('building_id')
      .notNull()
      .references(() => buildings.id, { onDelete: 'cascade' }),
    unitNumber: varchar('unit_number', { length: 50 }).notNull(),
    floor: integer('floor'),
    areaM2: decimal('area_m2', { precision: 10, scale: 2 }),
    bedrooms: integer('bedrooms'),
    bathrooms: integer('bathrooms'),
    parkingSpaces: integer('parking_spaces').default(0),
    parkingIdentifiers: text('parking_identifiers').array(),
    storageIdentifier: varchar('storage_identifier', { length: 50 }),
    aliquotPercentage: decimal('aliquot_percentage', {
      precision: 10,
      scale: 6,
    }),
    isActive: boolean('is_active').default(true),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_units_building').on(table.buildingId),
    index('idx_units_number').on(table.unitNumber),
    index('idx_units_active').on(table.isActive),
    index('idx_units_created_by').on(table.createdBy),
    uniqueIndex('idx_units_unique').on(table.buildingId, table.unitNumber),
  ]
)

// ============================================================================
// MÓDULO: PROPIEDAD Y RESIDENCIA
// ============================================================================

export const unitOwnerships = pgTable(
  'unit_ownerships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    unitId: uuid('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ownershipType: ownershipTypeEnum('ownership_type').notNull(),
    ownershipPercentage: decimal('ownership_percentage', {
      precision: 5,
      scale: 2,
    }),
    titleDeedNumber: varchar('title_deed_number', { length: 100 }),
    titleDeedDate: date('title_deed_date'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    isActive: boolean('is_active').default(true),
    isPrimaryResidence: boolean('is_primary_residence').default(false),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_unit_ownerships_unit').on(table.unitId),
    index('idx_unit_ownerships_user').on(table.userId),
    index('idx_unit_ownerships_type').on(table.ownershipType),
    index('idx_unit_ownerships_active').on(table.isActive),
  ]
)

// ============================================================================
// MÓDULO: CONCEPTOS DE PAGO
// ============================================================================

export const paymentConcepts = pgTable(
  'payment_concepts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id').references(() => condominiums.id, {
      onDelete: 'cascade',
    }),
    buildingId: uuid('building_id').references(() => buildings.id, {
      onDelete: 'cascade',
    }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    conceptType: conceptTypeEnum('concept_type').notNull(),
    isRecurring: boolean('is_recurring').default(true),
    recurrencePeriod: varchar('recurrence_period', { length: 50 }),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'restrict' }),
    isActive: boolean('is_active').default(true),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_payment_concepts_condominium').on(table.condominiumId),
    index('idx_payment_concepts_building').on(table.buildingId),
    index('idx_payment_concepts_type').on(table.conceptType),
    index('idx_payment_concepts_active').on(table.isActive),
    index('idx_payment_concepts_created_by').on(table.createdBy),
  ]
)

// ============================================================================
// MÓDULO: CONFIGURACIÓN DE INTERESES
// ============================================================================

export const interestConfigurations = pgTable(
  'interest_configurations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id').references(() => condominiums.id, {
      onDelete: 'cascade',
    }),
    buildingId: uuid('building_id').references(() => buildings.id, {
      onDelete: 'cascade',
    }),
    paymentConceptId: uuid('payment_concept_id').references(() => paymentConcepts.id, {
      onDelete: 'cascade',
    }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    interestType: interestTypeEnum('interest_type').notNull(),
    interestRate: decimal('interest_rate', { precision: 10, scale: 6 }),
    fixedAmount: decimal('fixed_amount', { precision: 15, scale: 2 }),
    calculationPeriod: varchar('calculation_period', { length: 50 }),
    gracePeriodDays: integer('grace_period_days').default(0),
    currencyId: uuid('currency_id').references(() => currencies.id, {
      onDelete: 'restrict',
    }),
    isActive: boolean('is_active').default(true),
    effectiveFrom: date('effective_from').notNull(),
    effectiveTo: date('effective_to'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_interest_configs_condominium').on(table.condominiumId),
    index('idx_interest_configs_building').on(table.buildingId),
    index('idx_interest_configs_concept').on(table.paymentConceptId),
    index('idx_interest_configs_active').on(table.isActive),
    index('idx_interest_configs_dates').on(table.effectiveFrom, table.effectiveTo),
    index('idx_interest_configs_created_by').on(table.createdBy),
  ]
)

// ============================================================================
// MÓDULO: CUOTAS
// ============================================================================

export const quotas = pgTable(
  'quotas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    unitId: uuid('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    paymentConceptId: uuid('payment_concept_id')
      .notNull()
      .references(() => paymentConcepts.id, { onDelete: 'restrict' }),
    periodYear: integer('period_year').notNull(),
    periodMonth: integer('period_month'),
    periodDescription: varchar('period_description', { length: 100 }),
    baseAmount: decimal('base_amount', { precision: 15, scale: 2 }).notNull(),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'restrict' }),
    interestAmount: decimal('interest_amount', {
      precision: 15,
      scale: 2,
    }).default('0'),
    amountInBaseCurrency: decimal('amount_in_base_currency', {
      precision: 15,
      scale: 2,
    }),
    exchangeRateUsed: decimal('exchange_rate_used', {
      precision: 20,
      scale: 8,
    }),
    issueDate: date('issue_date').notNull(),
    dueDate: date('due_date').notNull(),
    status: quotaStatusEnum('status').default('pending'),
    paidAmount: decimal('paid_amount', { precision: 15, scale: 2 }).default('0'),
    balance: decimal('balance', { precision: 15, scale: 2 }).notNull(),
    notes: text('notes'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_quotas_unit').on(table.unitId),
    index('idx_quotas_concept').on(table.paymentConceptId),
    index('idx_quotas_period').on(table.periodYear, table.periodMonth),
    index('idx_quotas_status').on(table.status),
    index('idx_quotas_due_date').on(table.dueDate),
    index('idx_quotas_currency').on(table.currencyId),
    index('idx_quotas_created_by').on(table.createdBy),
  ]
)

// ============================================================================
// MÓDULO: AJUSTES DE CUOTAS (Auditoría)
// ============================================================================

export const adjustmentTypeEnum = pgEnum('adjustment_type', [
  'discount',
  'increase',
  'correction',
  'waiver',
])

export const formulaTypeEnum = pgEnum('formula_type', ['fixed', 'expression', 'per_unit'])

export const frequencyTypeEnum = pgEnum('frequency_type', [
  'days',
  'monthly',
  'quarterly',
  'semi_annual',
  'annual',
])

export const generationMethodEnum = pgEnum('generation_method', [
  'manual_single',
  'manual_batch',
  'scheduled',
  'range',
])

export const generationStatusEnum = pgEnum('generation_status', ['completed', 'partial', 'failed'])

export const allocationStatusEnum = pgEnum('allocation_status', [
  'pending',
  'allocated',
  'refunded',
])

export const quotaAdjustments = pgTable(
  'quota_adjustments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quotaId: uuid('quota_id')
      .notNull()
      .references(() => quotas.id, { onDelete: 'cascade' }),
    previousAmount: decimal('previous_amount', { precision: 15, scale: 2 }).notNull(),
    newAmount: decimal('new_amount', { precision: 15, scale: 2 }).notNull(),
    adjustmentType: adjustmentTypeEnum('adjustment_type').notNull(),
    reason: text('reason').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    index('idx_quota_adjustments_quota').on(table.quotaId),
    index('idx_quota_adjustments_created_by').on(table.createdBy),
    index('idx_quota_adjustments_type').on(table.adjustmentType),
    check('check_amount_changed', sql`previous_amount != new_amount`),
  ]
)

// ============================================================================
// MÓDULO: FÓRMULAS Y GENERACIÓN DE CUOTAS
// ============================================================================

/**
 * Plantillas reutilizables para calcular montos de cuotas.
 * Pueden ser usadas por múltiples conceptos de pago.
 */
export const quotaFormulas = pgTable(
  'quota_formulas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    formulaType: formulaTypeEnum('formula_type').notNull(),
    // Para formula_type = 'fixed'
    fixedAmount: decimal('fixed_amount', { precision: 15, scale: 2 }),
    // Para formula_type = 'expression'
    expression: text('expression'),
    variables: jsonb('variables'),
    // Para formula_type = 'per_unit'
    unitAmounts: jsonb('unit_amounts'),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'restrict' }),
    isActive: boolean('is_active').default(true),
    // Trazabilidad
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    updatedAt: timestamp('updated_at').defaultNow(),
    updateReason: text('update_reason'),
  },
  table => [
    index('idx_quota_formulas_condominium').on(table.condominiumId),
    index('idx_quota_formulas_type').on(table.formulaType),
    index('idx_quota_formulas_active').on(table.isActive),
    index('idx_quota_formulas_created_by').on(table.createdBy),
  ]
)

/**
 * Vincula una fórmula a un concepto de pago con vigencia.
 */
export const quotaGenerationRules = pgTable(
  'quota_generation_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'cascade' }),
    buildingId: uuid('building_id').references(() => buildings.id, { onDelete: 'cascade' }),
    paymentConceptId: uuid('payment_concept_id')
      .notNull()
      .references(() => paymentConcepts.id, { onDelete: 'cascade' }),
    quotaFormulaId: uuid('quota_formula_id')
      .notNull()
      .references(() => quotaFormulas.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    // Vigencia
    effectiveFrom: date('effective_from').notNull(),
    effectiveTo: date('effective_to'),
    isActive: boolean('is_active').default(true),
    // Trazabilidad
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    updatedAt: timestamp('updated_at').defaultNow(),
    updateReason: text('update_reason'),
  },
  table => [
    index('idx_quota_gen_rules_condominium').on(table.condominiumId),
    index('idx_quota_gen_rules_building').on(table.buildingId),
    index('idx_quota_gen_rules_concept').on(table.paymentConceptId),
    index('idx_quota_gen_rules_formula').on(table.quotaFormulaId),
    index('idx_quota_gen_rules_dates').on(table.effectiveFrom, table.effectiveTo),
    index('idx_quota_gen_rules_active').on(table.isActive),
    index('idx_quota_gen_rules_created_by').on(table.createdBy),
  ]
)

/**
 * Configuración de generación automática con frecuencia flexible.
 */
export const quotaGenerationSchedules = pgTable(
  'quota_generation_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quotaGenerationRuleId: uuid('quota_generation_rule_id')
      .notNull()
      .references(() => quotaGenerationRules.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    // Frecuencia flexible
    frequencyType: frequencyTypeEnum('frequency_type').notNull(),
    frequencyValue: integer('frequency_value'), // Días si 'days', día del mes si 'monthly', etc.
    generationDay: integer('generation_day').notNull(), // Día para ejecutar (1-28)
    periodsInAdvance: integer('periods_in_advance').default(1),
    // Fechas de la cuota generada
    issueDay: integer('issue_day').notNull(),
    dueDay: integer('due_day').notNull(),
    graceDays: integer('grace_days').default(0),
    // Control de ejecución
    isActive: boolean('is_active').default(true),
    lastGeneratedPeriod: varchar('last_generated_period', { length: 20 }),
    lastGeneratedAt: timestamp('last_generated_at'),
    nextGenerationDate: date('next_generation_date'),
    // Trazabilidad
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    updatedAt: timestamp('updated_at').defaultNow(),
    updateReason: text('update_reason'),
  },
  table => [
    index('idx_quota_gen_schedules_rule').on(table.quotaGenerationRuleId),
    index('idx_quota_gen_schedules_frequency').on(table.frequencyType),
    index('idx_quota_gen_schedules_active').on(table.isActive),
    index('idx_quota_gen_schedules_next').on(table.nextGenerationDate),
    index('idx_quota_gen_schedules_created_by').on(table.createdBy),
  ]
)

/**
 * Auditoría de todas las generaciones de cuotas.
 */
export const quotaGenerationLogs = pgTable(
  'quota_generation_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    generationRuleId: uuid('generation_rule_id').references(() => quotaGenerationRules.id, {
      onDelete: 'set null',
    }),
    generationScheduleId: uuid('generation_schedule_id').references(
      () => quotaGenerationSchedules.id,
      { onDelete: 'set null' }
    ),
    quotaFormulaId: uuid('quota_formula_id').references(() => quotaFormulas.id, {
      onDelete: 'set null',
    }),
    generationMethod: generationMethodEnum('generation_method').notNull(),
    periodYear: integer('period_year').notNull(),
    periodMonth: integer('period_month'),
    periodDescription: varchar('period_description', { length: 100 }),
    // Resultados
    quotasCreated: integer('quotas_created').notNull().default(0),
    quotasFailed: integer('quotas_failed').notNull().default(0),
    totalAmount: decimal('total_amount', { precision: 15, scale: 2 }),
    currencyId: uuid('currency_id').references(() => currencies.id, { onDelete: 'set null' }),
    unitsAffected: uuid('units_affected').array(),
    // Detalles
    parameters: jsonb('parameters'),
    formulaSnapshot: jsonb('formula_snapshot'),
    status: generationStatusEnum('status').notNull(),
    errorDetails: text('error_details'),
    // Trazabilidad
    generatedBy: uuid('generated_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    generatedAt: timestamp('generated_at').defaultNow(),
  },
  table => [
    index('idx_quota_gen_logs_rule').on(table.generationRuleId),
    index('idx_quota_gen_logs_schedule').on(table.generationScheduleId),
    index('idx_quota_gen_logs_formula').on(table.quotaFormulaId),
    index('idx_quota_gen_logs_method').on(table.generationMethod),
    index('idx_quota_gen_logs_period').on(table.periodYear, table.periodMonth),
    index('idx_quota_gen_logs_status').on(table.status),
    index('idx_quota_gen_logs_generated_by').on(table.generatedBy),
    index('idx_quota_gen_logs_generated_at').on(table.generatedAt),
  ]
)

/**
 * Excedentes de pagos pendientes de asignación administrativa.
 */
export const paymentPendingAllocations = pgTable(
  'payment_pending_allocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'cascade' }),
    pendingAmount: decimal('pending_amount', { precision: 15, scale: 2 }).notNull(),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'restrict' }),
    status: allocationStatusEnum('status').notNull().default('pending'),
    // Resolución
    resolutionType: varchar('resolution_type', { length: 50 }),
    resolutionNotes: text('resolution_notes'),
    allocatedToQuotaId: uuid('allocated_to_quota_id').references(() => quotas.id, {
      onDelete: 'set null',
    }),
    // Trazabilidad
    createdAt: timestamp('created_at').defaultNow(),
    allocatedBy: uuid('allocated_by').references(() => users.id, { onDelete: 'set null' }),
    allocatedAt: timestamp('allocated_at'),
  },
  table => [
    index('idx_payment_pending_alloc_payment').on(table.paymentId),
    index('idx_payment_pending_alloc_status').on(table.status),
    index('idx_payment_pending_alloc_quota').on(table.allocatedToQuotaId),
    index('idx_payment_pending_alloc_allocated_by').on(table.allocatedBy),
  ]
)

// ============================================================================
// MÓDULO: PASARELAS DE PAGO
// ============================================================================

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

// ============================================================================
// MÓDULO: PAGOS
// ============================================================================

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

// ============================================================================
// MÓDULO: GASTOS
// ============================================================================

export const expenseCategories = pgTable(
  'expense_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    parentCategoryId: uuid('parent_category_id'),
    isActive: boolean('is_active').default(true),
    registeredBy: uuid('registered_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    index('idx_expense_categories_parent').on(table.parentCategoryId),
    index('idx_expense_categories_active').on(table.isActive),
    index('idx_expense_categories_registered_by').on(table.registeredBy),
    // Self-referencing foreign key
    foreignKey({
      columns: [table.parentCategoryId],
      foreignColumns: [table.id],
      name: 'fk_expense_categories_parent',
    }).onDelete('cascade'),
  ]
)

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id').references(() => condominiums.id, {
      onDelete: 'cascade',
    }),
    buildingId: uuid('building_id').references(() => buildings.id, {
      onDelete: 'cascade',
    }),
    expenseCategoryId: uuid('expense_category_id').references(() => expenseCategories.id, {
      onDelete: 'set null',
    }),
    description: text('description').notNull(),
    expenseDate: date('expense_date').notNull(),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'restrict' }),
    vendorName: varchar('vendor_name', { length: 255 }),
    vendorTaxId: varchar('vendor_tax_id', { length: 100 }),
    invoiceNumber: varchar('invoice_number', { length: 100 }),
    invoiceUrl: text('invoice_url'),
    status: expenseStatusEnum('status').default('pending'),
    approvedBy: uuid('approved_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    approvedAt: timestamp('approved_at'),
    notes: text('notes'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_expenses_condominium').on(table.condominiumId),
    index('idx_expenses_building').on(table.buildingId),
    index('idx_expenses_category').on(table.expenseCategoryId),
    index('idx_expenses_date').on(table.expenseDate),
    index('idx_expenses_status').on(table.status),
    index('idx_expenses_created_by').on(table.createdBy),
  ]
)

// ============================================================================
// MÓDULO: DOCUMENTOS
// ============================================================================

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentType: documentTypeEnum('document_type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    condominiumId: uuid('condominium_id').references(() => condominiums.id, {
      onDelete: 'cascade',
    }),
    buildingId: uuid('building_id').references(() => buildings.id, {
      onDelete: 'cascade',
    }),
    unitId: uuid('unit_id').references(() => units.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    paymentId: uuid('payment_id').references(() => payments.id, {
      onDelete: 'cascade',
    }),
    quotaId: uuid('quota_id').references(() => quotas.id, {
      onDelete: 'cascade',
    }),
    expenseId: uuid('expense_id').references(() => expenses.id, {
      onDelete: 'cascade',
    }),
    fileUrl: text('file_url').notNull(),
    fileName: varchar('file_name', { length: 255 }),
    fileSize: integer('file_size'),
    fileType: varchar('file_type', { length: 50 }),
    documentDate: date('document_date'),
    documentNumber: varchar('document_number', { length: 100 }),
    isPublic: boolean('is_public').default(false),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_documents_type').on(table.documentType),
    index('idx_documents_condominium').on(table.condominiumId),
    index('idx_documents_building').on(table.buildingId),
    index('idx_documents_unit').on(table.unitId),
    index('idx_documents_payment').on(table.paymentId),
    index('idx_documents_user').on(table.userId),
    index('idx_documents_date').on(table.documentDate),
    index('idx_documents_created_by').on(table.createdBy),
  ]
)

// ============================================================================
// MÓDULO: MENSAJERÍA Y NOTIFICACIONES
// ============================================================================

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    recipientType: recipientTypeEnum('recipient_type').notNull(),
    recipientUserId: uuid('recipient_user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    recipientCondominiumId: uuid('recipient_condominium_id').references(() => condominiums.id, {
      onDelete: 'cascade',
    }),
    recipientBuildingId: uuid('recipient_building_id').references(() => buildings.id, {
      onDelete: 'cascade',
    }),
    recipientUnitId: uuid('recipient_unit_id').references(() => units.id, {
      onDelete: 'cascade',
    }),
    subject: varchar('subject', { length: 255 }),
    body: text('body').notNull(),
    messageType: messageTypeEnum('message_type').default('message'),
    priority: priorityEnum('priority').default('normal'),
    attachments: jsonb('attachments'),
    isRead: boolean('is_read').default(false),
    readAt: timestamp('read_at'),
    metadata: jsonb('metadata'),
    registeredBy: uuid('registered_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    sentAt: timestamp('sent_at').defaultNow(),
  },
  table => [
    index('idx_messages_sender').on(table.senderId),
    index('idx_messages_recipient_user').on(table.recipientUserId),
    index('idx_messages_recipient_condominium').on(table.recipientCondominiumId),
    index('idx_messages_recipient_building').on(table.recipientBuildingId),
    index('idx_messages_recipient_unit').on(table.recipientUnitId),
    index('idx_messages_type').on(table.messageType),
    index('idx_messages_read').on(table.isRead),
    index('idx_messages_sent').on(table.sentAt),
    index('idx_messages_registered_by').on(table.registeredBy),
  ]
)

// ============================================================================
// MÓDULO: NOTIFICACIONES
// ============================================================================

/**
 * Plantillas de notificaciones reutilizables con variables.
 */
export const notificationTemplates = pgTable(
  'notification_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 100 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    category: notificationCategoryEnum('category').notNull(),
    subjectTemplate: varchar('subject_template', { length: 500 }),
    bodyTemplate: text('body_template').notNull(),
    variables: jsonb('variables'), // Array of variable names: ['user_name', 'amount']
    defaultChannels: jsonb('default_channels').default(['in_app']), // Array: ['in_app', 'email']
    isActive: boolean('is_active').default(true),
    metadata: jsonb('metadata'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_notification_templates_code').on(table.code),
    index('idx_notification_templates_category').on(table.category),
    index('idx_notification_templates_active').on(table.isActive),
    index('idx_notification_templates_created_by').on(table.createdBy),
  ]
)

/**
 * Notificaciones enviadas a usuarios.
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id').references(() => notificationTemplates.id, {
      onDelete: 'set null',
    }),
    category: notificationCategoryEnum('category').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    priority: priorityEnum('priority').default('normal'),
    data: jsonb('data'), // Additional data (links, action buttons, etc.)
    isRead: boolean('is_read').default(false),
    readAt: timestamp('read_at'),
    expiresAt: timestamp('expires_at'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    index('idx_notifications_user').on(table.userId),
    index('idx_notifications_template').on(table.templateId),
    index('idx_notifications_category').on(table.category),
    index('idx_notifications_read').on(table.userId, table.isRead),
    index('idx_notifications_created').on(table.createdAt),
  ]
)

/**
 * Estado de entrega de notificaciones por canal.
 */
export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    notificationId: uuid('notification_id')
      .notNull()
      .references(() => notifications.id, { onDelete: 'cascade' }),
    channel: notificationChannelEnum('channel').notNull(),
    status: deliveryStatusEnum('status').default('pending'),
    sentAt: timestamp('sent_at'),
    deliveredAt: timestamp('delivered_at'),
    failedAt: timestamp('failed_at'),
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').default(0),
    externalId: varchar('external_id', { length: 255 }), // Email provider ID
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    index('idx_notification_deliveries_notification').on(table.notificationId),
    index('idx_notification_deliveries_channel').on(table.channel),
    index('idx_notification_deliveries_status').on(table.status),
    uniqueIndex('idx_notification_deliveries_unique').on(table.notificationId, table.channel),
  ]
)

/**
 * Preferencias de notificación por usuario, categoría y canal.
 */
export const userNotificationPreferences = pgTable(
  'user_notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: notificationCategoryEnum('category').notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    isEnabled: boolean('is_enabled').default(true),
    quietHoursStart: varchar('quiet_hours_start', { length: 5 }), // "22:00" format
    quietHoursEnd: varchar('quiet_hours_end', { length: 5 }), // "08:00" format
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_user_notification_prefs_user').on(table.userId),
    index('idx_user_notification_prefs_category').on(table.category),
    index('idx_user_notification_prefs_channel').on(table.channel),
    uniqueIndex('idx_user_notification_prefs_unique').on(table.userId, table.category, table.channel),
  ]
)

/**
 * Tokens FCM de usuarios para push notifications.
 * Un usuario puede tener múltiples tokens (múltiples dispositivos).
 */
export const userFcmTokens = pgTable(
  'user_fcm_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 500 }).notNull(),
    platform: devicePlatformEnum('platform').notNull(),
    deviceName: varchar('device_name', { length: 255 }),
    isActive: boolean('is_active').default(true),
    lastUsedAt: timestamp('last_used_at'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_user_fcm_tokens_user').on(table.userId),
    index('idx_user_fcm_tokens_token').on(table.token),
    index('idx_user_fcm_tokens_active').on(table.userId, table.isActive),
    uniqueIndex('idx_user_fcm_tokens_unique').on(table.userId, table.token),
  ]
)

// ============================================================================
// MÓDULO: AUDITORÍA
// ============================================================================

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tableName: varchar('table_name', { length: 100 }).notNull(),
    recordId: uuid('record_id').notNull(),
    action: auditActionEnum('action').notNull(),
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    changedFields: text('changed_fields').array(),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    index('idx_audit_logs_table').on(table.tableName),
    index('idx_audit_logs_record').on(table.recordId),
    index('idx_audit_logs_user').on(table.userId),
    index('idx_audit_logs_action').on(table.action),
    index('idx_audit_logs_created').on(table.createdAt),
  ]
)

// ============================================================================
// RELATIONS
// ============================================================================

export const locationsRelations = relations(locations, ({ one, many }) => ({
  parent: one(locations, {
    fields: [locations.parentId],
    references: [locations.id],
    relationName: 'locationHierarchy',
  }),
  children: many(locations, { relationName: 'locationHierarchy' }),
  registeredByUser: one(users, {
    fields: [locations.registeredBy],
    references: [users.id],
  }),
  users: many(users),
  managementCompanies: many(managementCompanies),
  condominiums: many(condominiums),
}))

export const currenciesRelations = relations(currencies, ({ one, many }) => ({
  registeredByUser: one(users, {
    fields: [currencies.registeredBy],
    references: [users.id],
  }),
  exchangeRatesFrom: many(exchangeRates, { relationName: 'fromCurrency' }),
  exchangeRatesTo: many(exchangeRates, { relationName: 'toCurrency' }),
  users: many(users),
  condominiums: many(condominiums),
  paymentConcepts: many(paymentConcepts),
  interestConfigurations: many(interestConfigurations),
  quotas: many(quotas),
  payments: many(payments),
  expenses: many(expenses),
}))

export const exchangeRatesRelations = relations(exchangeRates, ({ one }) => ({
  fromCurrency: one(currencies, {
    fields: [exchangeRates.fromCurrencyId],
    references: [currencies.id],
    relationName: 'fromCurrency',
  }),
  toCurrency: one(currencies, {
    fields: [exchangeRates.toCurrencyId],
    references: [currencies.id],
    relationName: 'toCurrency',
  }),
  createdByUser: one(users, {
    fields: [exchangeRates.createdBy],
    references: [users.id],
  }),
  registeredByUser: one(users, {
    fields: [exchangeRates.registeredBy],
    references: [users.id],
  }),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  location: one(locations, {
    fields: [users.locationId],
    references: [locations.id],
  }),
  preferredCurrency: one(currencies, {
    fields: [users.preferredCurrencyId],
    references: [currencies.id],
  }),
  userRoles: many(userRoles),
  unitOwnerships: many(unitOwnerships),
  payments: many(payments),
  messages: many(messages),
  documents: many(documents),
  notifications: many(notifications),
  notificationPreferences: many(userNotificationPreferences),
  fcmTokens: many(userFcmTokens),
}))

export const permissionsRelations = relations(permissions, ({ one, many }) => ({
  registeredByUser: one(users, {
    fields: [permissions.registeredBy],
    references: [users.id],
  }),
  rolePermissions: many(rolePermissions),
}))

export const rolesRelations = relations(roles, ({ one, many }) => ({
  registeredByUser: one(users, {
    fields: [roles.registeredBy],
    references: [users.id],
  }),
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}))

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
  registeredByUser: one(users, {
    fields: [rolePermissions.registeredBy],
    references: [users.id],
  }),
}))

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
  condominium: one(condominiums, {
    fields: [userRoles.condominiumId],
    references: [condominiums.id],
  }),
  building: one(buildings, {
    fields: [userRoles.buildingId],
    references: [buildings.id],
  }),
  assignedByUser: one(users, {
    fields: [userRoles.assignedBy],
    references: [users.id],
  }),
  registeredByUser: one(users, {
    fields: [userRoles.registeredBy],
    references: [users.id],
  }),
}))

export const managementCompaniesRelations = relations(managementCompanies, ({ one, many }) => ({
  location: one(locations, {
    fields: [managementCompanies.locationId],
    references: [locations.id],
  }),
  createdByUser: one(users, {
    fields: [managementCompanies.createdBy],
    references: [users.id],
  }),
  condominiums: many(condominiums),
}))

export const condominiumsRelations = relations(condominiums, ({ one, many }) => ({
  managementCompany: one(managementCompanies, {
    fields: [condominiums.managementCompanyId],
    references: [managementCompanies.id],
  }),
  location: one(locations, {
    fields: [condominiums.locationId],
    references: [locations.id],
  }),
  defaultCurrency: one(currencies, {
    fields: [condominiums.defaultCurrencyId],
    references: [currencies.id],
  }),
  createdByUser: one(users, {
    fields: [condominiums.createdBy],
    references: [users.id],
  }),
  buildings: many(buildings),
  userRoles: many(userRoles),
  paymentConcepts: many(paymentConcepts),
  interestConfigurations: many(interestConfigurations),
  entityPaymentGateways: many(entityPaymentGateways),
  expenses: many(expenses),
  documents: many(documents),
  messages: many(messages),
  quotaFormulas: many(quotaFormulas),
  quotaGenerationRules: many(quotaGenerationRules),
}))

export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  condominium: one(condominiums, {
    fields: [buildings.condominiumId],
    references: [condominiums.id],
  }),
  createdByUser: one(users, {
    fields: [buildings.createdBy],
    references: [users.id],
  }),
  units: many(units),
  userRoles: many(userRoles),
  paymentConcepts: many(paymentConcepts),
  interestConfigurations: many(interestConfigurations),
  entityPaymentGateways: many(entityPaymentGateways),
  expenses: many(expenses),
  documents: many(documents),
  messages: many(messages),
  quotaGenerationRules: many(quotaGenerationRules),
}))

export const unitsRelations = relations(units, ({ one, many }) => ({
  building: one(buildings, {
    fields: [units.buildingId],
    references: [buildings.id],
  }),
  createdByUser: one(users, {
    fields: [units.createdBy],
    references: [users.id],
  }),
  unitOwnerships: many(unitOwnerships),
  quotas: many(quotas),
  payments: many(payments),
  documents: many(documents),
  messages: many(messages),
}))

export const unitOwnershipsRelations = relations(unitOwnerships, ({ one }) => ({
  unit: one(units, {
    fields: [unitOwnerships.unitId],
    references: [units.id],
  }),
  user: one(users, {
    fields: [unitOwnerships.userId],
    references: [users.id],
  }),
}))

export const paymentConceptsRelations = relations(paymentConcepts, ({ one, many }) => ({
  condominium: one(condominiums, {
    fields: [paymentConcepts.condominiumId],
    references: [condominiums.id],
  }),
  building: one(buildings, {
    fields: [paymentConcepts.buildingId],
    references: [buildings.id],
  }),
  currency: one(currencies, {
    fields: [paymentConcepts.currencyId],
    references: [currencies.id],
  }),
  createdByUser: one(users, {
    fields: [paymentConcepts.createdBy],
    references: [users.id],
  }),
  interestConfigurations: many(interestConfigurations),
  quotas: many(quotas),
  generationRules: many(quotaGenerationRules),
}))

export const interestConfigurationsRelations = relations(interestConfigurations, ({ one }) => ({
  condominium: one(condominiums, {
    fields: [interestConfigurations.condominiumId],
    references: [condominiums.id],
  }),
  building: one(buildings, {
    fields: [interestConfigurations.buildingId],
    references: [buildings.id],
  }),
  paymentConcept: one(paymentConcepts, {
    fields: [interestConfigurations.paymentConceptId],
    references: [paymentConcepts.id],
  }),
  currency: one(currencies, {
    fields: [interestConfigurations.currencyId],
    references: [currencies.id],
  }),
  createdByUser: one(users, {
    fields: [interestConfigurations.createdBy],
    references: [users.id],
  }),
}))

export const quotasRelations = relations(quotas, ({ one, many }) => ({
  unit: one(units, {
    fields: [quotas.unitId],
    references: [units.id],
  }),
  paymentConcept: one(paymentConcepts, {
    fields: [quotas.paymentConceptId],
    references: [paymentConcepts.id],
  }),
  currency: one(currencies, {
    fields: [quotas.currencyId],
    references: [currencies.id],
  }),
  createdByUser: one(users, {
    fields: [quotas.createdBy],
    references: [users.id],
  }),
  paymentApplications: many(paymentApplications),
  documents: many(documents),
  adjustments: many(quotaAdjustments),
  allocatedFromPending: many(paymentPendingAllocations),
}))

export const quotaAdjustmentsRelations = relations(quotaAdjustments, ({ one }) => ({
  quota: one(quotas, {
    fields: [quotaAdjustments.quotaId],
    references: [quotas.id],
  }),
  createdByUser: one(users, {
    fields: [quotaAdjustments.createdBy],
    references: [users.id],
  }),
}))

export const quotaFormulasRelations = relations(quotaFormulas, ({ one, many }) => ({
  condominium: one(condominiums, {
    fields: [quotaFormulas.condominiumId],
    references: [condominiums.id],
  }),
  currency: one(currencies, {
    fields: [quotaFormulas.currencyId],
    references: [currencies.id],
  }),
  createdByUser: one(users, {
    fields: [quotaFormulas.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [quotaFormulas.updatedBy],
    references: [users.id],
  }),
  generationRules: many(quotaGenerationRules),
}))

export const quotaGenerationRulesRelations = relations(quotaGenerationRules, ({ one, many }) => ({
  condominium: one(condominiums, {
    fields: [quotaGenerationRules.condominiumId],
    references: [condominiums.id],
  }),
  building: one(buildings, {
    fields: [quotaGenerationRules.buildingId],
    references: [buildings.id],
  }),
  paymentConcept: one(paymentConcepts, {
    fields: [quotaGenerationRules.paymentConceptId],
    references: [paymentConcepts.id],
  }),
  quotaFormula: one(quotaFormulas, {
    fields: [quotaGenerationRules.quotaFormulaId],
    references: [quotaFormulas.id],
  }),
  createdByUser: one(users, {
    fields: [quotaGenerationRules.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [quotaGenerationRules.updatedBy],
    references: [users.id],
  }),
  schedules: many(quotaGenerationSchedules),
  logs: many(quotaGenerationLogs),
}))

export const quotaGenerationSchedulesRelations = relations(
  quotaGenerationSchedules,
  ({ one }) => ({
    generationRule: one(quotaGenerationRules, {
      fields: [quotaGenerationSchedules.quotaGenerationRuleId],
      references: [quotaGenerationRules.id],
    }),
    createdByUser: one(users, {
      fields: [quotaGenerationSchedules.createdBy],
      references: [users.id],
    }),
    updatedByUser: one(users, {
      fields: [quotaGenerationSchedules.updatedBy],
      references: [users.id],
    }),
  })
)

export const quotaGenerationLogsRelations = relations(quotaGenerationLogs, ({ one }) => ({
  generationRule: one(quotaGenerationRules, {
    fields: [quotaGenerationLogs.generationRuleId],
    references: [quotaGenerationRules.id],
  }),
  generationSchedule: one(quotaGenerationSchedules, {
    fields: [quotaGenerationLogs.generationScheduleId],
    references: [quotaGenerationSchedules.id],
  }),
  quotaFormula: one(quotaFormulas, {
    fields: [quotaGenerationLogs.quotaFormulaId],
    references: [quotaFormulas.id],
  }),
  currency: one(currencies, {
    fields: [quotaGenerationLogs.currencyId],
    references: [currencies.id],
  }),
  generatedByUser: one(users, {
    fields: [quotaGenerationLogs.generatedBy],
    references: [users.id],
  }),
}))

export const paymentPendingAllocationsRelations = relations(
  paymentPendingAllocations,
  ({ one }) => ({
    payment: one(payments, {
      fields: [paymentPendingAllocations.paymentId],
      references: [payments.id],
    }),
    currency: one(currencies, {
      fields: [paymentPendingAllocations.currencyId],
      references: [currencies.id],
    }),
    allocatedToQuota: one(quotas, {
      fields: [paymentPendingAllocations.allocatedToQuotaId],
      references: [quotas.id],
    }),
    allocatedByUser: one(users, {
      fields: [paymentPendingAllocations.allocatedBy],
      references: [users.id],
    }),
  })
)

export const paymentGatewaysRelations = relations(paymentGateways, ({ one, many }) => ({
  registeredByUser: one(users, {
    fields: [paymentGateways.registeredBy],
    references: [users.id],
  }),
  entityPaymentGateways: many(entityPaymentGateways),
  payments: many(payments),
}))

export const entityPaymentGatewaysRelations = relations(entityPaymentGateways, ({ one }) => ({
  paymentGateway: one(paymentGateways, {
    fields: [entityPaymentGateways.paymentGatewayId],
    references: [paymentGateways.id],
  }),
  condominium: one(condominiums, {
    fields: [entityPaymentGateways.condominiumId],
    references: [condominiums.id],
  }),
  building: one(buildings, {
    fields: [entityPaymentGateways.buildingId],
    references: [buildings.id],
  }),
  registeredByUser: one(users, {
    fields: [entityPaymentGateways.registeredBy],
    references: [users.id],
  }),
}))

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  unit: one(units, {
    fields: [payments.unitId],
    references: [units.id],
  }),
  currency: one(currencies, {
    fields: [payments.currencyId],
    references: [currencies.id],
  }),
  paidCurrency: one(currencies, {
    fields: [payments.paidCurrencyId],
    references: [currencies.id],
  }),
  paymentGateway: one(paymentGateways, {
    fields: [payments.paymentGatewayId],
    references: [paymentGateways.id],
  }),
  registeredByUser: one(users, {
    fields: [payments.registeredBy],
    references: [users.id],
  }),
  paymentApplications: many(paymentApplications),
  documents: many(documents),
  pendingAllocations: many(paymentPendingAllocations),
}))

export const paymentApplicationsRelations = relations(paymentApplications, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentApplications.paymentId],
    references: [payments.id],
  }),
  quota: one(quotas, {
    fields: [paymentApplications.quotaId],
    references: [quotas.id],
  }),
  registeredByUser: one(users, {
    fields: [paymentApplications.registeredBy],
    references: [users.id],
  }),
}))

export const expenseCategoriesRelations = relations(expenseCategories, ({ one, many }) => ({
  parent: one(expenseCategories, {
    fields: [expenseCategories.parentCategoryId],
    references: [expenseCategories.id],
    relationName: 'categoryHierarchy',
  }),
  children: many(expenseCategories, { relationName: 'categoryHierarchy' }),
  registeredByUser: one(users, {
    fields: [expenseCategories.registeredBy],
    references: [users.id],
  }),
  expenses: many(expenses),
}))

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  condominium: one(condominiums, {
    fields: [expenses.condominiumId],
    references: [condominiums.id],
  }),
  building: one(buildings, {
    fields: [expenses.buildingId],
    references: [buildings.id],
  }),
  expenseCategory: one(expenseCategories, {
    fields: [expenses.expenseCategoryId],
    references: [expenseCategories.id],
  }),
  currency: one(currencies, {
    fields: [expenses.currencyId],
    references: [currencies.id],
  }),
  approvedByUser: one(users, {
    fields: [expenses.approvedBy],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [expenses.createdBy],
    references: [users.id],
  }),
  documents: many(documents),
}))

export const documentsRelations = relations(documents, ({ one }) => ({
  condominium: one(condominiums, {
    fields: [documents.condominiumId],
    references: [condominiums.id],
  }),
  building: one(buildings, {
    fields: [documents.buildingId],
    references: [buildings.id],
  }),
  unit: one(units, {
    fields: [documents.unitId],
    references: [units.id],
  }),
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  payment: one(payments, {
    fields: [documents.paymentId],
    references: [payments.id],
  }),
  quota: one(quotas, {
    fields: [documents.quotaId],
    references: [quotas.id],
  }),
  expense: one(expenses, {
    fields: [documents.expenseId],
    references: [expenses.id],
  }),
  createdByUser: one(users, {
    fields: [documents.createdBy],
    references: [users.id],
  }),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  recipientUser: one(users, {
    fields: [messages.recipientUserId],
    references: [users.id],
  }),
  recipientCondominium: one(condominiums, {
    fields: [messages.recipientCondominiumId],
    references: [condominiums.id],
  }),
  recipientBuilding: one(buildings, {
    fields: [messages.recipientBuildingId],
    references: [buildings.id],
  }),
  recipientUnit: one(units, {
    fields: [messages.recipientUnitId],
    references: [units.id],
  }),
  registeredByUser: one(users, {
    fields: [messages.registeredBy],
    references: [users.id],
  }),
}))

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}))

// ============================================================================
// RELATIONS: NOTIFICACIONES
// ============================================================================

export const notificationTemplatesRelations = relations(notificationTemplates, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [notificationTemplates.createdBy],
    references: [users.id],
  }),
  notifications: many(notifications),
}))

export const notificationsRelations = relations(notifications, ({ one, many }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  template: one(notificationTemplates, {
    fields: [notifications.templateId],
    references: [notificationTemplates.id],
  }),
  deliveries: many(notificationDeliveries),
}))

export const notificationDeliveriesRelations = relations(notificationDeliveries, ({ one }) => ({
  notification: one(notifications, {
    fields: [notificationDeliveries.notificationId],
    references: [notifications.id],
  }),
}))

export const userNotificationPreferencesRelations = relations(
  userNotificationPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [userNotificationPreferences.userId],
      references: [users.id],
    }),
  })
)

export const userFcmTokensRelations = relations(userFcmTokens, ({ one }) => ({
  user: one(users, {
    fields: [userFcmTokens.userId],
    references: [users.id],
  }),
}))
