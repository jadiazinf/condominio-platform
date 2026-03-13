import { and, eq, desc, lte, gte, or, sql, inArray, type SQL } from 'drizzle-orm'
import type { TQuota, TQuotaCreate, TQuotaUpdate, TPaginatedResponse } from '@packages/domain'
import { quotas, paymentConcepts } from '../drizzle/schema'
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
   * Retrieves overdue quotas (pending or already marked overdue, with due date in the past).
   */
  async getOverdue(asOfDate: string): Promise<TQuota[]> {
    const results = await this.db
      .select()
      .from(quotas)
      .where(and(
        or(eq(quotas.status, 'pending'), eq(quotas.status, 'overdue')),
        lte(quotas.dueDate, asOfDate),
      ))

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

  /**
   * Gets all quotas for a payment concept.
   */
  async getByPaymentConceptId(conceptId: string): Promise<TQuota[]> {
    const results = await this.db
      .select()
      .from(quotas)
      .where(eq(quotas.paymentConceptId, conceptId))
      .orderBy(quotas.unitId, quotas.dueDate)

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Gets non-paid quotas (pending/overdue) for a concept filtered by unit IDs.
   */
  async getNonPaidByPaymentConceptAndUnits(
    conceptId: string,
    unitIds: string[]
  ): Promise<TQuota[]> {
    if (unitIds.length === 0) return []

    const results = await this.db
      .select()
      .from(quotas)
      .where(
        and(
          eq(quotas.paymentConceptId, conceptId),
          inArray(quotas.unitId, unitIds),
          or(eq(quotas.status, 'pending'), eq(quotas.status, 'overdue'))
        )
      )
      .orderBy(quotas.unitId, quotas.dueDate)

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Cancels all non-paid quotas (pending/overdue) for a payment concept.
   * Returns the count of cancelled quotas.
   */
  async cancelAllNonPaidByConceptId(conceptId: string): Promise<number> {
    const results = await this.db
      .update(quotas)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(
        and(
          eq(quotas.paymentConceptId, conceptId),
          or(eq(quotas.status, 'pending'), eq(quotas.status, 'overdue'))
        )
      )
      .returning()

    return results.length
  }

  /**
   * Gets aggregated summary for reserve fund quotas of a condominium.
   */
  async getReserveFundSummary(condominiumId: string): Promise<{
    totalCharged: string
    totalPaid: string
    totalPending: string
    conceptCount: number
  }> {
    // Financial totals from quotas (only exists if quotas have been generated)
    const totalsResult = await this.db
      .select({
        totalCharged: sql<string>`COALESCE(SUM(${quotas.baseAmount}::numeric), 0)::text`,
        totalPaid: sql<string>`COALESCE(SUM(${quotas.paidAmount}::numeric), 0)::text`,
        totalPending: sql<string>`COALESCE(SUM(${quotas.balance}::numeric), 0)::text`,
      })
      .from(quotas)
      .innerJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
      .where(
        and(
          eq(paymentConcepts.condominiumId, condominiumId),
          eq(paymentConcepts.conceptType, 'reserve_fund')
        )
      )

    // Concept count directly from payment_concepts (independent of quotas)
    const countResult = await this.db
      .select({
        conceptCount: sql<number>`COUNT(*)::int`,
      })
      .from(paymentConcepts)
      .where(
        and(
          eq(paymentConcepts.condominiumId, condominiumId),
          eq(paymentConcepts.conceptType, 'reserve_fund'),
          eq(paymentConcepts.isActive, true)
        )
      )

    const totals = totalsResult[0]
    const count = countResult[0]

    return {
      totalCharged: totals?.totalCharged ?? '0',
      totalPaid: totals?.totalPaid ?? '0',
      totalPending: totals?.totalPending ?? '0',
      conceptCount: count?.conceptCount ?? 0,
    }
  }
}
