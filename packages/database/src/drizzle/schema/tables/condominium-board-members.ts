import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  index,
  unique,
} from 'drizzle-orm/pg-core'
import { condominiums } from './condominiums'
import { users } from './users'
import { boardPositionEnum, boardMemberStatusEnum } from '../enums'

export const condominiumBoardMembers = pgTable(
  'condominium_board_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    position: boardPositionEnum('position').notNull(),
    status: boardMemberStatusEnum('status').notNull().default('active'),
    // Term dates
    electedAt: date('elected_at').notNull(),
    termEndsAt: date('term_ends_at'),
    // Reference to the assembly that elected them
    assemblyMinuteId: uuid('assembly_minute_id'),
    notes: text('notes'),
    // Audit
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_board_members_condominium').on(table.condominiumId),
    index('idx_board_members_user').on(table.userId),
    index('idx_board_members_status').on(table.status),
    index('idx_board_members_position').on(table.position),
  ]
)
