import { pgTable, uuid, boolean, timestamp, decimal, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { paymentConcepts } from './payment-concepts'
import { condominiums } from './condominiums'
import { buildings } from './buildings'
import { units } from './units'
import { users } from './users'
import { assignmentScopeEnum, distributionMethodEnum } from '../enums'

export const paymentConceptAssignments = pgTable(
  'payment_concept_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentConceptId: uuid('payment_concept_id')
      .notNull()
      .references(() => paymentConcepts.id, { onDelete: 'cascade' }),
    scopeType: assignmentScopeEnum('scope_type').notNull(),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'cascade' }),
    buildingId: uuid('building_id').references(() => buildings.id, { onDelete: 'cascade' }),
    unitId: uuid('unit_id').references(() => units.id, { onDelete: 'cascade' }),
    distributionMethod: distributionMethodEnum('distribution_method').notNull(),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    isActive: boolean('is_active').default(true),
    assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_pca_concept').on(table.paymentConceptId),
    index('idx_pca_scope').on(table.scopeType),
    index('idx_pca_condominium').on(table.condominiumId),
    index('idx_pca_building').on(table.buildingId),
    index('idx_pca_unit').on(table.unitId),
    index('idx_pca_active').on(table.isActive),
    uniqueIndex('idx_pca_unique_assignment').on(
      table.paymentConceptId,
      table.scopeType,
      table.buildingId,
      table.unitId
    ),
  ]
)
