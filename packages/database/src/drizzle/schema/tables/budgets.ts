import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  timestamp,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { condominiums } from './condominiums'
import { currencies } from './currencies'
import { expenseCategories } from './expenses'
import { budgetStatusEnum, budgetTypeEnum } from '../enums'

// ─────────────────────────────────────────────────────────────────────────────
// Budgets
// ─────────────────────────────────────────────────────────────────────────────

export const budgets = pgTable(
  'budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    condominiumId: uuid('condominium_id')
      .notNull()
      .references(() => condominiums.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    budgetType: budgetTypeEnum('budget_type').notNull().default('monthly'),
    periodYear: integer('period_year').notNull(),
    periodMonth: integer('period_month'), // null for annual budgets
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'restrict' }),
    status: budgetStatusEnum('status').notNull().default('draft'),
    totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull().default('0'),
    reserveFundPercentage: decimal('reserve_fund_percentage', { precision: 5, scale: 2 }).default(
      '0'
    ),
    approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at'),
    notes: text('notes'),
    metadata: jsonb('metadata'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_budgets_condominium').on(table.condominiumId),
    index('idx_budgets_status').on(table.status),
    index('idx_budgets_period').on(table.periodYear, table.periodMonth),
    unique('uq_budgets_condo_period').on(
      table.condominiumId,
      table.budgetType,
      table.periodYear,
      table.periodMonth
    ),
  ]
)

// ─────────────────────────────────────────────────────────────────────────────
// Budget Items (line items per expense category)
// ─────────────────────────────────────────────────────────────────────────────

export const budgetItems = pgTable(
  'budget_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    budgetId: uuid('budget_id')
      .notNull()
      .references(() => budgets.id, { onDelete: 'cascade' }),
    expenseCategoryId: uuid('expense_category_id').references(() => expenseCategories.id, {
      onDelete: 'set null',
    }),
    description: varchar('description', { length: 255 }).notNull(),
    budgetedAmount: decimal('budgeted_amount', { precision: 15, scale: 2 }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  table => [
    index('idx_budget_items_budget').on(table.budgetId),
    index('idx_budget_items_category').on(table.expenseCategoryId),
  ]
)
