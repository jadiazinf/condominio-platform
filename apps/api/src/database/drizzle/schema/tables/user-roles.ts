import { pgTable, uuid, timestamp, boolean, text, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users'
import { roles } from './roles'
import { condominiums } from './condominiums'
import { buildings } from './buildings'

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
    isActive: boolean('is_active').default(true),
    notes: text('notes'),
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
    index('idx_user_roles_active').on(table.isActive),
    uniqueIndex('idx_user_roles_unique').on(
      table.userId,
      table.roleId,
      table.condominiumId,
      table.buildingId
    ),
  ]
)
