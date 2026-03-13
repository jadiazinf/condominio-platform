import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  decimal,
  integer,
  date,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { condominiums } from './condominiums'
import { buildings } from './buildings'
import { paymentConcepts } from './payment-concepts'
import { currencies } from './currencies'
import { users } from './users'
import { quotas } from './quotas'
import {
  formulaTypeEnum,
  frequencyTypeEnum,
  generationMethodEnum,
  generationStatusEnum,
  allocationStatusEnum,
} from '../enums'

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

// Forward declaration for payments (will be imported from payments.ts)
// This is needed because paymentPendingAllocations references payments
declare const payments: { id: ReturnType<typeof uuid> }

/**
 * Excedentes de pagos pendientes de asignación administrativa.
 */
export const paymentPendingAllocations = pgTable(
  'payment_pending_allocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentId: uuid('payment_id').notNull(),
    // Note: Foreign key to payments is added via SQL migration due to circular dependency
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
