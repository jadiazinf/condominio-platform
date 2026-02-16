import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core'
import { managementCompanies } from './management-companies'
import { users } from './users'
import { userRoles } from './user-roles'
import { memberRoleEnum } from '../enums'
import { sql } from 'drizzle-orm'

export const managementCompanyMembers = pgTable(
  'management_company_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    managementCompanyId: uuid('management_company_id')
      .notNull()
      .references(() => managementCompanies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Roles: 'admin' (owner), 'accountant', 'support', 'viewer'
    // DEPRECATED: Use userRoleId → user_roles → roles for role lookup
    roleName: memberRoleEnum('role_name').notNull(),

    // Link to unified user_roles table for role management
    userRoleId: uuid('user_role_id').references(() => userRoles.id, {
      onDelete: 'set null',
    }),

    // Permisos específicos (JSONB para flexibilidad)
    permissions: jsonb('permissions').$type<{
      can_change_subscription?: boolean
      can_manage_members?: boolean
      can_create_tickets?: boolean
      can_view_invoices?: boolean
    }>(),

    isPrimaryAdmin: boolean('is_primary_admin').default(false),
    joinedAt: timestamp('joined_at').defaultNow(),
    invitedAt: timestamp('invited_at'),
    invitedBy: uuid('invited_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    isActive: boolean('is_active').default(true),
    deactivatedAt: timestamp('deactivated_at'),
    deactivatedBy: uuid('deactivated_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_members_company').on(table.managementCompanyId),
    index('idx_members_user').on(table.userId),
    index('idx_members_role').on(table.roleName),
    index('idx_members_primary').on(table.isPrimaryAdmin),
    index('idx_members_invited_by').on(table.invitedBy),
    // Único member por usuario por company
    uniqueIndex('idx_members_unique').on(table.managementCompanyId, table.userId),
  ]
)
