import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { condominiums } from './condominiums'
import { buildings } from './buildings'
import { units } from './units'
import { recipientTypeEnum, messageTypeEnum, priorityEnum } from '../enums'

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    recipientType: recipientTypeEnum('recipient_type').notNull(),
    recipientUserId: uuid('recipient_user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    recipientCondominiumId: uuid('recipient_condominium_id').references(() => condominiums.id, {
      onDelete: 'cascade',
    }),
    recipientBuildingId: uuid('recipient_building_id').references(() => buildings.id, {
      onDelete: 'cascade',
    }),
    recipientUnitId: uuid('recipient_unit_id').references(() => units.id, {
      onDelete: 'cascade',
    }),
    subject: varchar('subject', { length: 255 }),
    body: text('body').notNull(),
    messageType: messageTypeEnum('message_type').default('message'),
    priority: priorityEnum('priority').default('normal'),
    attachments: jsonb('attachments'),
    isRead: boolean('is_read').default(false),
    readAt: timestamp('read_at'),
    metadata: jsonb('metadata'),
    registeredBy: uuid('registered_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    sentAt: timestamp('sent_at').defaultNow(),
  },
  table => [
    index('idx_messages_sender').on(table.senderId),
    index('idx_messages_recipient_user').on(table.recipientUserId),
    index('idx_messages_recipient_condominium').on(table.recipientCondominiumId),
    index('idx_messages_recipient_building').on(table.recipientBuildingId),
    index('idx_messages_recipient_unit').on(table.recipientUnitId),
    index('idx_messages_type').on(table.messageType),
    index('idx_messages_read').on(table.isRead),
    index('idx_messages_sent').on(table.sentAt),
    index('idx_messages_registered_by').on(table.registeredBy),
  ]
)
