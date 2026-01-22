import { pgTable, uuid, varchar, text, timestamp, jsonb, inet, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { auditActionEnum } from '../enums'

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tableName: varchar('table_name', { length: 100 }).notNull(),
    recordId: uuid('record_id').notNull(),
    action: auditActionEnum('action').notNull(),
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    changedFields: text('changed_fields').array(),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    index('idx_audit_logs_table').on(table.tableName),
    index('idx_audit_logs_record').on(table.recordId),
    index('idx_audit_logs_user').on(table.userId),
    index('idx_audit_logs_action').on(table.action),
    index('idx_audit_logs_created').on(table.createdAt),
  ]
)
