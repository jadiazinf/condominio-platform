import {
  pgTable,
  uuid,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { roles } from './roles'
import { permissions } from './permissions'

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
