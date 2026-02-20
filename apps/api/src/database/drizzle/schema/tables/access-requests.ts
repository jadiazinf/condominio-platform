import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { condominiums } from './condominiums'
import { units } from './units'
import { users } from './users'
import { condominiumAccessCodes } from './condominium-access-codes'
import { ownershipTypeEnum, accessRequestStatusEnum } from '../enums'

export const accessRequests = pgTable(
  'access_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'cascade' }),
    unitId: uuid('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessCodeId: uuid('access_code_id')
      .notNull()
      .references(() => condominiumAccessCodes.id, { onDelete: 'cascade' }),
    ownershipType: ownershipTypeEnum('ownership_type').notNull(),
    status: accessRequestStatusEnum('status').default('pending').notNull(),
    adminNotes: text('admin_notes'),
    reviewedBy: uuid('reviewed_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    reviewedAt: timestamp('reviewed_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_access_requests_condominium').on(table.condominiumId),
    index('idx_access_requests_unit').on(table.unitId),
    index('idx_access_requests_user').on(table.userId),
    index('idx_access_requests_access_code').on(table.accessCodeId),
    index('idx_access_requests_status').on(table.status),
  ]
)
