import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  inet,
  text,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { managementCompanySubscriptions } from './management-company-subscriptions'
import { subscriptionTermsConditions } from './subscription-terms-conditions'
import { users } from './users'
import { acceptanceStatusEnum } from '../enums'

export const subscriptionAcceptances = pgTable(
  'subscription_acceptances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => managementCompanySubscriptions.id, { onDelete: 'cascade' }),
    termsConditionsId: uuid('terms_conditions_id')
      .notNull()
      .references(() => subscriptionTermsConditions.id, { onDelete: 'restrict' }),
    token: varchar('token', { length: 64 }).notNull(), // For email verification
    tokenHash: varchar('token_hash', { length: 64 }).notNull(), // SHA-256 hash
    status: acceptanceStatusEnum('status').default('pending').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedBy: uuid('accepted_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    acceptedAt: timestamp('accepted_at'),
    acceptorEmail: varchar('acceptor_email', { length: 255 }),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_acceptance_subscription').on(table.subscriptionId),
    index('idx_acceptance_status').on(table.status),
    index('idx_acceptance_expires_at').on(table.expiresAt),
    uniqueIndex('idx_acceptance_token_hash').on(table.tokenHash),
  ]
)
