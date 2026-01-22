import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { users } from './users'
import {
  notificationCategoryEnum,
  notificationChannelEnum,
  priorityEnum,
  deliveryStatusEnum,
  devicePlatformEnum,
} from '../enums'

/**
 * Plantillas de notificaciones reutilizables con variables.
 */
export const notificationTemplates = pgTable(
  'notification_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 100 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    category: notificationCategoryEnum('category').notNull(),
    subjectTemplate: varchar('subject_template', { length: 500 }),
    bodyTemplate: text('body_template').notNull(),
    variables: jsonb('variables'), // Array of variable names: ['user_name', 'amount']
    defaultChannels: jsonb('default_channels').default(['in_app']), // Array: ['in_app', 'email']
    isActive: boolean('is_active').default(true),
    metadata: jsonb('metadata'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_notification_templates_code').on(table.code),
    index('idx_notification_templates_category').on(table.category),
    index('idx_notification_templates_active').on(table.isActive),
    index('idx_notification_templates_created_by').on(table.createdBy),
  ]
)

/**
 * Notificaciones enviadas a usuarios.
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id').references(() => notificationTemplates.id, {
      onDelete: 'set null',
    }),
    category: notificationCategoryEnum('category').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    priority: priorityEnum('priority').default('normal'),
    data: jsonb('data'), // Additional data (links, action buttons, etc.)
    isRead: boolean('is_read').default(false),
    readAt: timestamp('read_at'),
    expiresAt: timestamp('expires_at'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    index('idx_notifications_user').on(table.userId),
    index('idx_notifications_template').on(table.templateId),
    index('idx_notifications_category').on(table.category),
    index('idx_notifications_read').on(table.userId, table.isRead),
    index('idx_notifications_created').on(table.createdAt),
  ]
)

/**
 * Estado de entrega de notificaciones por canal.
 */
export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    notificationId: uuid('notification_id')
      .notNull()
      .references(() => notifications.id, { onDelete: 'cascade' }),
    channel: notificationChannelEnum('channel').notNull(),
    status: deliveryStatusEnum('status').default('pending'),
    sentAt: timestamp('sent_at'),
    deliveredAt: timestamp('delivered_at'),
    failedAt: timestamp('failed_at'),
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').default(0),
    externalId: varchar('external_id', { length: 255 }), // Email provider ID
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    index('idx_notification_deliveries_notification').on(table.notificationId),
    index('idx_notification_deliveries_channel').on(table.channel),
    index('idx_notification_deliveries_status').on(table.status),
    uniqueIndex('idx_notification_deliveries_unique').on(table.notificationId, table.channel),
  ]
)

/**
 * Preferencias de notificación por usuario, categoría y canal.
 */
export const userNotificationPreferences = pgTable(
  'user_notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: notificationCategoryEnum('category').notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    isEnabled: boolean('is_enabled').default(true),
    quietHoursStart: varchar('quiet_hours_start', { length: 5 }), // "22:00" format
    quietHoursEnd: varchar('quiet_hours_end', { length: 5 }), // "08:00" format
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_user_notification_prefs_user').on(table.userId),
    index('idx_user_notification_prefs_category').on(table.category),
    index('idx_user_notification_prefs_channel').on(table.channel),
    uniqueIndex('idx_user_notification_prefs_unique').on(
      table.userId,
      table.category,
      table.channel
    ),
  ]
)

/**
 * Tokens FCM de usuarios para push notifications.
 * Un usuario puede tener múltiples tokens (múltiples dispositivos).
 */
export const userFcmTokens = pgTable(
  'user_fcm_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 500 }).notNull(),
    platform: devicePlatformEnum('platform').notNull(),
    deviceName: varchar('device_name', { length: 255 }),
    isActive: boolean('is_active').default(true),
    lastUsedAt: timestamp('last_used_at'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_user_fcm_tokens_user').on(table.userId),
    index('idx_user_fcm_tokens_token').on(table.token),
    index('idx_user_fcm_tokens_active').on(table.userId, table.isActive),
    uniqueIndex('idx_user_fcm_tokens_unique').on(table.userId, table.token),
  ]
)
