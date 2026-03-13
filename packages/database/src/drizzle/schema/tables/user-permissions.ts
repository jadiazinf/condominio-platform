import { pgTable, uuid, timestamp, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users'
import { permissions } from './permissions'

/**
 * User-level permission assignments.
 * This allows assigning permissions directly to users (e.g., superadmins)
 * instead of relying solely on role-based permissions.
 */
export const userPermissions = pgTable(
  'user_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    isEnabled: boolean('is_enabled').notNull().default(true),
    assignedBy: uuid('assigned_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_user_permissions_user').on(table.userId),
    index('idx_user_permissions_permission').on(table.permissionId),
    index('idx_user_permissions_assigned_by').on(table.assignedBy),
    uniqueIndex('idx_user_permissions_unique').on(table.userId, table.permissionId),
  ]
)
