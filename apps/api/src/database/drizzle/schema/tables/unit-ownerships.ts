import {
  pgTable,
  uuid,
  boolean,
  timestamp,
  decimal,
  varchar,
  date,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { units } from './units'
import { users } from './users'
import { ownershipTypeEnum } from '../enums'

export const unitOwnerships = pgTable(
  'unit_ownerships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    unitId: uuid('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ownershipType: ownershipTypeEnum('ownership_type').notNull(),
    ownershipPercentage: decimal('ownership_percentage', {
      precision: 5,
      scale: 2,
    }),
    titleDeedNumber: varchar('title_deed_number', { length: 100 }),
    titleDeedDate: date('title_deed_date'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    isActive: boolean('is_active').default(true),
    isPrimaryResidence: boolean('is_primary_residence').default(false),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_unit_ownerships_unit').on(table.unitId),
    index('idx_unit_ownerships_user').on(table.userId),
    index('idx_unit_ownerships_type').on(table.ownershipType),
    index('idx_unit_ownerships_active').on(table.isActive),
  ]
)
