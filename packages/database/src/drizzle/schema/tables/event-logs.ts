import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  inet,
  integer,
  index,
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { condominiums } from './condominiums'
import {
  eventLogCategoryEnum,
  eventLogLevelEnum,
  eventLogResultEnum,
  eventLogSourceEnum,
} from '../enums'

export const eventLogs = pgTable(
  'event_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    category: eventLogCategoryEnum('category').notNull(),
    level: eventLogLevelEnum('level').notNull(),
    event: varchar('event', { length: 200 }).notNull(),
    action: varchar('action', { length: 200 }).notNull(),
    message: text('message').notNull(),
    module: varchar('module', { length: 100 }),
    condominiumId: uuid('condominium_id').references(() => condominiums.id, {
      onDelete: 'set null',
    }),
    entityType: varchar('entity_type', { length: 100 }),
    entityId: uuid('entity_id'),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    userRole: varchar('user_role', { length: 50 }),
    result: eventLogResultEnum('result').notNull(),
    errorCode: varchar('error_code', { length: 50 }),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata'),
    durationMs: integer('duration_ms'),
    source: eventLogSourceEnum('source').notNull().default('api'),
    ipAddress: inet('ip_address'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    index('idx_event_logs_category').on(table.category),
    index('idx_event_logs_level').on(table.level),
    index('idx_event_logs_event').on(table.event),
    index('idx_event_logs_condominium').on(table.condominiumId),
    index('idx_event_logs_entity').on(table.entityType, table.entityId),
    index('idx_event_logs_user').on(table.userId),
    index('idx_event_logs_result').on(table.result),
    index('idx_event_logs_source').on(table.source),
    index('idx_event_logs_created').on(table.createdAt),
  ]
)
