import { pgTable, uuid, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { condominiums } from './condominiums'
import { managementCompanies } from './management-companies'
import { users } from './users'

/**
 * Junction table for many-to-many relationship between condominiums and management companies.
 * A condominium must belong to at least one management company.
 * A management company can manage multiple condominiums.
 */
export const condominiumManagementCompanies = pgTable(
  'condominium_management_companies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'cascade' }),
    managementCompanyId: uuid('management_company_id')
      .notNull()
      .references(() => managementCompanies.id, { onDelete: 'cascade' }),
    assignedBy: uuid('assigned_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    assignedAt: timestamp('assigned_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_condo_mgmt_condominium').on(table.condominiumId),
    index('idx_condo_mgmt_company').on(table.managementCompanyId),
    index('idx_condo_mgmt_assigned_by').on(table.assignedBy),
    // Unique constraint to prevent duplicate assignments
    uniqueIndex('idx_condo_mgmt_unique').on(table.condominiumId, table.managementCompanyId),
  ]
)
