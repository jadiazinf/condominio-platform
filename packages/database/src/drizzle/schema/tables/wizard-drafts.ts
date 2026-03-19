import { pgTable, uuid, integer, jsonb, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { wizardTypeEnum } from '../enums'
import { users } from './users'

export const wizardDrafts = pgTable(
  'wizard_drafts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    wizardType: wizardTypeEnum('wizard_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    data: jsonb('data').notNull().default({}),
    currentStep: integer('current_step').notNull().default(0),
    lastModifiedBy: uuid('last_modified_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    uniqueIndex('idx_wizard_drafts_type_entity').on(table.wizardType, table.entityId),
    index('idx_wizard_drafts_entity').on(table.entityId),
  ]
)
