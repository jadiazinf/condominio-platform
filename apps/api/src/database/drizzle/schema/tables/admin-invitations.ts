import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  foreignKey,
} from 'drizzle-orm/pg-core'
import { adminInvitationStatusEnum } from '../enums'
import { users } from './users'
import { managementCompanies } from './management-companies'

/**
 * Admin Invitations Table
 *
 * Tracks invitations sent to users to become administrators of management companies.
 * This table is used when a superadmin creates a new management company with a new admin user.
 * The invitation contains a token that the user receives via email to confirm their registration.
 */
export const adminInvitations = pgTable(
  'admin_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // The user being invited (created with isActive=false until confirmed)
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // The management company they will administer
    managementCompanyId: uuid('management_company_id')
      .notNull()
      .references(() => managementCompanies.id, { onDelete: 'cascade' }),
    // Unique invitation token (URL-safe random string)
    token: varchar('token', { length: 128 }).notNull().unique(),
    // Token hash for secure comparison (SHA-256)
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    // Status of the invitation
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
    // Who created the invitation (superadmin)
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_admin_invitations_user').on(table.userId),
    index('idx_admin_invitations_company').on(table.managementCompanyId),
    index('idx_admin_invitations_token').on(table.token),
    index('idx_admin_invitations_token_hash').on(table.tokenHash),
    index('idx_admin_invitations_status').on(table.status),
    index('idx_admin_invitations_email').on(table.email),
    index('idx_admin_invitations_expires').on(table.expiresAt),
  ]
)
