import { and, eq, desc, gte, lte, sql, type SQL } from 'drizzle-orm'
import type { TExpense, TExpenseCreate, TExpenseUpdate, TPaginatedResponse } from '@packages/domain'
import { expenses } from '../drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TExpenseRecord = typeof expenses.$inferSelect

/**
 * Repository for managing expense entities.
 * Uses status-based workflow instead of soft delete.
 */
export class ExpensesRepository
  extends BaseRepository<typeof expenses, TExpense, TExpenseCreate, TExpenseUpdate>
  implements IRepositoryWithHardDelete<TExpense, TExpenseCreate, TExpenseUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, expenses)
  }

  protected mapToEntity(record: unknown): TExpense {
    const r = record as TExpenseRecord
    return {
      id: r.id,
      condominiumId: r.condominiumId,
      buildingId: r.buildingId,
      expenseCategoryId: r.expenseCategoryId,
      description: r.description,
      expenseDate: r.expenseDate,
      amount: r.amount,
      currencyId: r.currencyId,
      vendorName: r.vendorName,
      vendorTaxId: r.vendorTaxId,
      invoiceNumber: r.invoiceNumber,
      invoiceUrl: r.invoiceUrl,
      status: (r.status ?? 'pending') as TExpense['status'],
      approvedBy: r.approvedBy,
      approvedAt: r.approvedAt,
      notes: r.notes,
      metadata: r.metadata as Record<string, unknown> | null,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  /**
   * Override listAll since expenses don't have isActive.
   */
  override async listAll(): Promise<TExpense[]> {
    const results = await this.db.select().from(expenses).orderBy(desc(expenses.expenseDate))
    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Override delete to use hard delete.
   */
  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  /**
   * Retrieves expenses by condominium.
   */
  async getByCondominiumId(condominiumId: string): Promise<TExpense[]> {
    const results = await this.db
      .select()
      .from(expenses)
      .where(eq(expenses.condominiumId, condominiumId))
      .orderBy(desc(expenses.expenseDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves expenses by building.
   */
  async getByBuildingId(buildingId: string): Promise<TExpense[]> {
    const results = await this.db
      .select()
      .from(expenses)
      .where(eq(expenses.buildingId, buildingId))
      .orderBy(desc(expenses.expenseDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves expenses by status.
   */
  async getByStatus(status: TExpense['status']): Promise<TExpense[]> {
    const results = await this.db
      .select()
      .from(expenses)
      .where(eq(expenses.status, status))
      .orderBy(desc(expenses.expenseDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves expenses by category.
   */
  async getByCategoryId(expenseCategoryId: string): Promise<TExpense[]> {
    const results = await this.db
      .select()
      .from(expenses)
      .where(eq(expenses.expenseCategoryId, expenseCategoryId))
      .orderBy(desc(expenses.expenseDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves expenses within a date range.
   */
  async getByDateRange(startDate: string, endDate: string): Promise<TExpense[]> {
    const results = await this.db
      .select()
      .from(expenses)
      .where(and(gte(expenses.expenseDate, startDate), lte(expenses.expenseDate, endDate)))
      .orderBy(desc(expenses.expenseDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves pending expenses for approval.
   */
  async getPendingApproval(): Promise<TExpense[]> {
    const results = await this.db
      .select()
      .from(expenses)
      .where(eq(expenses.status, 'pending'))
      .orderBy(desc(expenses.expenseDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Lists paginated expenses linked to the reserve fund for a condominium.
   */
  async listReserveFundExpensesPaginated(
    condominiumId: string,
    options: {
      page?: number
      limit?: number
      status?: string
      startDate?: string
      endDate?: string
    }
  ): Promise<TPaginatedResponse<TExpense>> {
    const conditions: SQL[] = [
      eq(expenses.condominiumId, condominiumId),
      sql`${expenses.metadata}->>'fundSource' = 'reserve_fund'`,
    ]

    if (options.status) {
      conditions.push(eq(expenses.status, options.status as TExpense['status']))
    }
    if (options.startDate) {
      conditions.push(gte(expenses.expenseDate, options.startDate))
    }
    if (options.endDate) {
      conditions.push(lte(expenses.expenseDate, options.endDate))
    }

    return this.listPaginated(
      { page: options.page, limit: options.limit },
      conditions
    )
  }

  /**
   * Gets the total amount of paid reserve fund expenses for a condominium.
   */
  async getReserveFundExpensesTotal(condominiumId: string): Promise<string> {
    const result = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)::text`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.condominiumId, condominiumId),
          eq(expenses.status, 'paid'),
          sql`${expenses.metadata}->>'fundSource' = 'reserve_fund'`
        )
      )

    return result[0]?.total ?? '0'
  }
}
