import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  date,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { condominiums } from './condominiums'
import { buildings } from './buildings'
import { units } from './units'
import { payments } from './payments'
import { quotas } from './quotas'
import { expenses } from './expenses'
import { documentTypeEnum } from '../enums'

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentType: documentTypeEnum('document_type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    condominiumId: uuid('condominium_id').references(() => condominiums.id, {
      onDelete: 'cascade',
    }),
    buildingId: uuid('building_id').references(() => buildings.id, {
      onDelete: 'cascade',
    }),
    unitId: uuid('unit_id').references(() => units.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    paymentId: uuid('payment_id').references(() => payments.id, {
      onDelete: 'cascade',
    }),
    quotaId: uuid('quota_id').references(() => quotas.id, {
      onDelete: 'cascade',
    }),
    expenseId: uuid('expense_id').references(() => expenses.id, {
      onDelete: 'cascade',
    }),
    fileUrl: text('file_url').notNull(),
    fileName: varchar('file_name', { length: 255 }),
    fileSize: integer('file_size'),
    fileType: varchar('file_type', { length: 50 }),
    documentDate: date('document_date'),
    documentNumber: varchar('document_number', { length: 100 }),
    isPublic: boolean('is_public').default(false),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_documents_type').on(table.documentType),
    index('idx_documents_condominium').on(table.condominiumId),
    index('idx_documents_building').on(table.buildingId),
    index('idx_documents_unit').on(table.unitId),
    index('idx_documents_payment').on(table.paymentId),
    index('idx_documents_user').on(table.userId),
    index('idx_documents_date').on(table.documentDate),
    index('idx_documents_created_by').on(table.createdBy),
  ]
)
