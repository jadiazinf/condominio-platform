import { and, eq, desc, lte, gte, or, type SQL } from 'drizzle-orm'
import type { TQuota, TQuotaCreate, TQuotaUpdate, TPaginatedResponse } from '@packages/domain'
import { quotas } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TQuotaRecord = typeof quotas.$inferSelect

/**
 * Repository for managing quota entities.
 * Uses status-based workflow instead of soft delete.
 */
export class QuotasRepository
  extends BaseRepository<typeof quotas, TQuota, TQuotaCreate, TQuotaUpdate>
  implements IRepositoryWithHardDelete<TQuota, TQuotaCreate, TQuotaUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, quotas)
  }

  protected mapToEntity(record: unknown): TQuota {
    const r = record as TQuotaRecord
    return {
      id: r.id,
      unitId: r.unitId,
      paymentConceptId: r.paymentConceptId,
      periodYear: r.periodYear,
      periodMonth: r.periodMonth,
      periodDescription: r.periodDescription,
      baseAmount: r.baseAmount,
      currencyId: r.currencyId,
      interestAmount: r.interestAmount ?? '0',
      amountInBaseCurrency: r.amountInBaseCurrency,
      exchangeRateUsed: r.exchangeRateUsed,
      issueDate: r.issueDate,
      dueDate: r.dueDate,
      status: (r.status ?? 'pending') as TQuota['status'],
      paidAmount: r.paidAmount ?? '0',
      balance: r.balance,
      notes: r.notes,
      metadata: r.metadata as Record<string, unknown> | null,
      createdBy: r.createdBy,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TQuotaCreate): Record<string, unknown> {
    return {
      unitId: dto.unitId,
      paymentConceptId: dto.paymentConceptId,
      periodYear: dto.periodYear,
      periodMonth: dto.periodMonth,
      periodDescription: dto.periodDescription,
      baseAmount: dto.baseAmount,
      currencyId: dto.currencyId,
      interestAmount: dto.interestAmount,
      amountInBaseCurrency: dto.amountInBaseCurrency,
      exchangeRateUsed: dto.exchangeRateUsed,
      issueDate: dto.issueDate,
      dueDate: dto.dueDate,
      status: dto.status,
      paidAmount: dto.paidAmount,
      balance: dto.balance,
      notes: dto.notes,
      metadata: dto.metadata,
      createdBy: dto.createdBy,
    }
  }

  protected mapToUpdateValues(dto: TQuotaUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.unitId !== undefined) values.unitId = dto.unitId
    if (dto.paymentConceptId !== undefined) values.paymentConceptId = dto.paymentConceptId
    if (dto.periodYear !== undefined) values.periodYear = dto.periodYear
    if (dto.periodMonth !== undefined) values.periodMonth = dto.periodMonth
    if (dto.periodDescription !== undefined) values.periodDescription = dto.periodDescription
    if (dto.baseAmount !== undefined) values.baseAmount = dto.baseAmount
    if (dto.currencyId !== undefined) values.currencyId = dto.currencyId
    if (dto.interestAmount !== undefined) values.interestAmount = dto.interestAmount
    if (dto.amountInBaseCurrency !== undefined)
      values.amountInBaseCurrency = dto.amountInBaseCurrency
    if (dto.exchangeRateUsed !== undefined) values.exchangeRateUsed = dto.exchangeRateUsed
    if (dto.issueDate !== undefined) values.issueDate = dto.issueDate
    if (dto.dueDate !== undefined) values.dueDate = dto.dueDate
    if (dto.status !== undefined) values.status = dto.status
    if (dto.paidAmount !== undefined) values.paidAmount = dto.paidAmount
    if (dto.balance !== undefined) values.balance = dto.balance
    if (dto.notes !== undefined) values.notes = dto.notes
    if (dto.metadata !== undefined) values.metadata = dto.metadata
    if (dto.createdBy !== undefined) values.createdBy = dto.createdBy

    return values
  }

  /**
   * Override listAll since quotas don't have isActive.
   */
  override async listAll(): Promise<TQuota[]> {
    const results = await this.db.select().from(quotas)
    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Override delete to cancel the quota instead of deleting.
   */
  override async delete(id: string): Promise<boolean> {
    const results = await this.db
      .update(quotas)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(quotas.id, id))
      .returning()

    return results.length > 0
  }

  /**
   * Retrieves paginated quotas for a unit with optional filters.
   */
  async listPaginatedByUnit(
    unitId: string,
    options: { page?: number; limit?: number; startDate?: string; endDate?: string; status?: string }
  ): Promise<TPaginatedResponse<TQuota>> {
    const conditions: SQL[] = [eq(quotas.unitId, unitId)]

    if (options.startDate) {
      conditions.push(gte(quotas.dueDate, options.startDate))
    }
    if (options.endDate) {
      conditions.push(lte(quotas.dueDate, options.endDate))
    }
    if (options.status) {
      conditions.push(eq(quotas.status, options.status as TQuota['status']))
    }

    return this.listPaginated({ page: options.page, limit: options.limit }, conditions)
  }

  /**
   * Retrieves quotas by unit.
   */
  async getByUnitId(unitId: string): Promise<TQuota[]> {
    const results = await this.db.select().from(quotas).where(eq(quotas.unitId, unitId))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves quotas by status.
   */
  async getByStatus(status: TQuota['status']): Promise<TQuota[]> {
    const results = await this.db.select().from(quotas).where(eq(quotas.status, status))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves pending quotas for a unit.
   */
  async getPendingByUnit(unitId: string): Promise<TQuota[]> {
    const results = await this.db
      .select()
      .from(quotas)
      .where(and(eq(quotas.unitId, unitId), eq(quotas.status, 'pending')))
      .orderBy(desc(quotas.dueDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves overdue quotas.
   */
  async getOverdue(asOfDate: string): Promise<TQuota[]> {
    const results = await this.db
      .select()
      .from(quotas)
      .where(and(eq(quotas.status, 'pending'), lte(quotas.dueDate, asOfDate)))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Checks if quotas already exist for a payment concept and period.
   */
  async existsForConceptAndPeriod(
    conceptId: string,
    year: number,
    month: number
  ): Promise<boolean> {
    const results = await this.db
      .select({ id: quotas.id })
      .from(quotas)
      .where(
        and(
          eq(quotas.paymentConceptId, conceptId),
          eq(quotas.periodYear, year),
          eq(quotas.periodMonth, month)
        )
      )
      .limit(1)

    return results.length > 0
  }

  /**
   * Creates multiple quotas in batch.
   */
  async createMany(records: Record<string, unknown>[]): Promise<{ id: string }[]> {
    if (records.length === 0) return []

    const results = await this.db
      .insert(quotas)
      .values(records as (typeof quotas.$inferInsert)[])
      .returning()

    return results.map(r => ({ id: r.id }))
  }

  /**
   * Returns delinquent quotas for a payment concept:
   * status = 'overdue' OR (status = 'pending' AND dueDate <= asOfDate)
   */
  async getDelinquentByConcept(conceptId: string, asOfDate: string): Promise<TQuota[]> {
    const results = await this.db
      .select()
      .from(quotas)
      .where(
        and(
          eq(quotas.paymentConceptId, conceptId),
          or(
            eq(quotas.status, 'overdue'),
            and(eq(quotas.status, 'pending'), lte(quotas.dueDate, asOfDate))
          )
        )
      )
      .orderBy(quotas.unitId, quotas.dueDate)

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves quotas for a period.
   */
  async getByPeriod(year: number, month?: number): Promise<TQuota[]> {
    const conditions = [eq(quotas.periodYear, year)]

    if (month !== undefined) {
      conditions.push(eq(quotas.periodMonth, month))
    }

    const results = await this.db
      .select()
      .from(quotas)
      .where(and(...conditions))

    return results.map(record => this.mapToEntity(record))
  }
}
