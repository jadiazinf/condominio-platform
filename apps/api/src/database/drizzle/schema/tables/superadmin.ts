import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { permissions } from './permissions'

export const superadminUsers = pgTable(
  'superadmin_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    notes: text('notes'),
    isActive: boolean('is_active').default(true),
    lastAccessAt: timestamp('last_access_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_superadmin_users_user').on(table.userId),
    index('idx_superadmin_users_active').on(table.isActive),
    index('idx_superadmin_users_created_by').on(table.createdBy),
  ]
)

export const superadminUserPermissions = pgTable(
  'superadmin_user_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    superadminUserId: uuid('superadmin_user_id')
      .notNull()
      .references(() => superadminUsers.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_superadmin_user_permissions_superadmin').on(table.superadminUserId),
    index('idx_superadmin_user_permissions_permission').on(table.permissionId),
    index('idx_superadmin_user_permissions_created_by').on(table.createdBy),
    uniqueIndex('idx_superadmin_user_permissions_unique').on(
      table.superadminUserId,
      table.permissionId
    ),
  ]
)
