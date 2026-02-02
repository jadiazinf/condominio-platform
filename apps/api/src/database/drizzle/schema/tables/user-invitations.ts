import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'
import { adminInvitationStatusEnum } from '../enums'
import { users } from './users'
import { condominiums } from './condominiums'
import { roles } from './roles'

/**
 * User Invitations Table
 *
 * Tracks invitations sent to users to join the platform and be assigned to condominiums.
 * This table is used when an admin invites a new user to join a condominium with a specific role.
 * The invitation contains a token that the user receives via email to confirm their registration.
 */
export const userInvitations = pgTable(
  'user_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // The user being invited (created with isActive=false until confirmed)
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // The condominium they will be assigned to (optional - null for global users like superadmins)
    condominiumId: uuid('condominium_id').references(() => condominiums.id, {
      onDelete: 'cascade',
    }),
    // The role they will be assigned
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    // Unique invitation token (URL-safe random string)
    token: varchar('token', { length: 128 }).notNull().unique(),
    // Token hash for secure comparison (SHA-256)
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    // Status of the invitation (reuses admin invitation status enum)
    status: adminInvitationStatusEnum('status').default('pending').notNull(),
    // Email the invitation was sent to
    email: varchar('email', { length: 255 }).notNull(),
    // When the invitation expires (default 7 days from creation)
    expiresAt: timestamp('expires_at').notNull(),
    // When the invitation was accepted
    acceptedAt: timestamp('accepted_at'),
    // Error message if email delivery failed
    emailError: text('email_error'),
    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    // Who created the invitation (admin/superadmin)
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_user_invitations_user').on(table.userId),
    index('idx_user_invitations_condominium').on(table.condominiumId),
    index('idx_user_invitations_role').on(table.roleId),
    index('idx_user_invitations_token').on(table.token),
    index('idx_user_invitations_token_hash').on(table.tokenHash),
    index('idx_user_invitations_status').on(table.status),
    index('idx_user_invitations_email').on(table.email),
    index('idx_user_invitations_expires').on(table.expiresAt),
  ]
)
