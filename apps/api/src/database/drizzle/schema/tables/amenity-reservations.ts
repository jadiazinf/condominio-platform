import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { amenities } from './amenities'
import { users } from './users'
import { reservationStatusEnum } from '../enums'

export const amenityReservations = pgTable(
  'amenity_reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    amenityId: uuid('amenity_id')
      .notNull()
      .references(() => amenities.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time').notNull(),
    status: reservationStatusEnum('status').default('pending'),
    notes: text('notes'),
    rejectionReason: text('rejection_reason'),
    approvedBy: uuid('approved_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    approvedAt: timestamp('approved_at'),
    cancelledAt: timestamp('cancelled_at'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_amenity_reservations_amenity').on(table.amenityId),
    index('idx_amenity_reservations_user').on(table.userId),
    index('idx_amenity_reservations_status').on(table.status),
    index('idx_amenity_reservations_start_time').on(table.startTime),
    index('idx_amenity_reservations_end_time').on(table.endTime),
  ]
)
