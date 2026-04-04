import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  integer,
  decimal,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { condominiums } from './condominiums'
import { users } from './users'
import { assemblyMinuteStatusEnum, assemblyTypeEnum } from '../enums'

export const assemblyMinutes = pgTable(
  'assembly_minutes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'cascade' }),
    // Assembly info
    title: varchar('title', { length: 255 }).notNull(),
    assemblyType: assemblyTypeEnum('assembly_type').notNull(),
    assemblyDate: date('assembly_date').notNull(),
    assemblyLocation: varchar('assembly_location', { length: 255 }),
    // Quorum
    quorumPercentage: decimal('quorum_percentage', { precision: 5, scale: 2 }),
    attendeesCount: integer('attendees_count'),
    totalUnits: integer('total_units'),
    // Content
    agenda: text('agenda'),
    decisions: jsonb('decisions'),
    notes: text('notes'),
    // Document
    documentUrl: text('document_url'),
    documentFileName: varchar('document_file_name', { length: 255 }),
    // Status
    status: assemblyMinuteStatusEnum('status').notNull().default('draft'),
    isActive: boolean('is_active').default(true),
    // Audit
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_assembly_minutes_condominium').on(table.condominiumId),
    index('idx_assembly_minutes_date').on(table.assemblyDate),
    index('idx_assembly_minutes_status').on(table.status),
    index('idx_assembly_minutes_type').on(table.assemblyType),
  ]
)
