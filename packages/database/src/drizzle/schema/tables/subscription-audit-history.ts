import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  inet,
  index,
} from 'drizzle-orm/pg-core'
import { managementCompanySubscriptions } from './management-company-subscriptions'
import { users } from './users'
import { subscriptionAuditActionEnum } from '../enums'

export const subscriptionAuditHistory = pgTable(
  'subscription_audit_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => managementCompanySubscriptions.id, { onDelete: 'cascade' }),
    action: subscriptionAuditActionEnum('action').notNull(),
    previousValues: jsonb('previous_values').$type<Record<string, unknown>>(),
    newValues: jsonb('new_values').$type<Record<string, unknown>>(),
    changedFields: text('changed_fields').array(),
    performedBy: uuid('performed_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    performedAt: timestamp('performed_at').defaultNow().notNull(),
    reason: text('reason'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
  },
  (table) => [
    index('idx_subscription_audit_subscription').on(table.subscriptionId),
    index('idx_subscription_audit_action').on(table.action),
    index('idx_subscription_audit_performed_by').on(table.performedBy),
    index('idx_subscription_audit_performed_at').on(table.performedAt),
  ]
)
