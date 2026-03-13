import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  decimal,
  date,
  jsonb,
  index,
  foreignKey,
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { condominiums } from './condominiums'
import { buildings } from './buildings'
import { currencies } from './currencies'
import { expenseStatusEnum } from '../enums'

export const expenseCategories = pgTable(
  'expense_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    parentCategoryId: uuid('parent_category_id'),
    isActive: boolean('is_active').default(true),
    registeredBy: uuid('registered_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => [
    index('idx_expense_categories_parent').on(table.parentCategoryId),
    index('idx_expense_categories_active').on(table.isActive),
    index('idx_expense_categories_registered_by').on(table.registeredBy),
    // Self-referencing foreign key
    foreignKey({
      columns: [table.parentCategoryId],
      foreignColumns: [table.id],
      name: 'fk_expense_categories_parent',
    }).onDelete('cascade'),
  ]
)

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id').references(() => condominiums.id, {
      onDelete: 'cascade',
    }),
    buildingId: uuid('building_id').references(() => buildings.id, {
      onDelete: 'cascade',
    }),
    expenseCategoryId: uuid('expense_category_id').references(() => expenseCategories.id, {
      onDelete: 'set null',
    }),
    description: text('description').notNull(),
    expenseDate: date('expense_date').notNull(),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'restrict' }),
    vendorName: varchar('vendor_name', { length: 255 }),
    vendorTaxId: varchar('vendor_tax_id', { length: 100 }),
    invoiceNumber: varchar('invoice_number', { length: 100 }),
    invoiceUrl: text('invoice_url'),
    status: expenseStatusEnum('status').default('pending'),
    approvedBy: uuid('approved_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    approvedAt: timestamp('approved_at'),
    notes: text('notes'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  table => [
    index('idx_expenses_condominium').on(table.condominiumId),
    index('idx_expenses_building').on(table.buildingId),
    index('idx_expenses_category').on(table.expenseCategoryId),
    index('idx_expenses_date').on(table.expenseDate),
    index('idx_expenses_status').on(table.status),
    index('idx_expenses_created_by').on(table.createdBy),
  ]
)
