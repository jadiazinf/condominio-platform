import { and, eq, desc, gte, lte } from 'drizzle-orm'
import type { TExpense, TExpenseCreate, TExpenseUpdate } from '@packages/domain'
import { expenses } from '@database/drizzle/schema'
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

  protected mapToInsertValues(dto: TExpenseCreate): Record<string, unknown> {
    return {
      condominiumId: dto.condominiumId,
      buildingId: dto.buildingId,
      expenseCategoryId: dto.expenseCategoryId,
      description: dto.description,
      expenseDate: dto.expenseDate,
      amount: dto.amount,
      currencyId: dto.currencyId,
      vendorName: dto.vendorName,
      vendorTaxId: dto.vendorTaxId,
      invoiceNumber: dto.invoiceNumber,
      invoiceUrl: dto.invoiceUrl,
      status: dto.status,
      approvedBy: dto.approvedBy,
      approvedAt: dto.approvedAt,
      notes: dto.notes,
      metadata: dto.metadata,
      createdBy: dto.createdBy,
    }
  }

  protected mapToUpdateValues(dto: TExpenseUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.condominiumId !== undefined) values.condominiumId = dto.condominiumId
    if (dto.buildingId !== undefined) values.buildingId = dto.buildingId
    if (dto.expenseCategoryId !== undefined) values.expenseCategoryId = dto.expenseCategoryId
    if (dto.description !== undefined) values.description = dto.description
    if (dto.expenseDate !== undefined) values.expenseDate = dto.expenseDate
    if (dto.amount !== undefined) values.amount = dto.amount
    if (dto.currencyId !== undefined) values.currencyId = dto.currencyId
    if (dto.vendorName !== undefined) values.vendorName = dto.vendorName
    if (dto.vendorTaxId !== undefined) values.vendorTaxId = dto.vendorTaxId
    if (dto.invoiceNumber !== undefined) values.invoiceNumber = dto.invoiceNumber
    if (dto.invoiceUrl !== undefined) values.invoiceUrl = dto.invoiceUrl
    if (dto.status !== undefined) values.status = dto.status
    if (dto.approvedBy !== undefined) values.approvedBy = dto.approvedBy
    if (dto.approvedAt !== undefined) values.approvedAt = dto.approvedAt
    if (dto.notes !== undefined) values.notes = dto.notes
    if (dto.metadata !== undefined) values.metadata = dto.metadata
    if (dto.createdBy !== undefined) values.createdBy = dto.createdBy

    return values
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
}
