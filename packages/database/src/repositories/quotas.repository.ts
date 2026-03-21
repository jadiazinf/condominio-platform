import { and, eq, desc, asc, lte, gte, or, sql, inArray, notInArray, type SQL } from 'drizzle-orm'
import type { TQuota, TQuotaCreate, TQuotaUpdate, TPaginatedResponse } from '@packages/domain'
import { quotas, paymentConcepts, currencies, units, buildings } from '../drizzle/schema'
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
      adjustmentsTotal: r.adjustmentsTotal ?? '0',
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
   * Retrieves all quotas belonging to a condominium via paymentConcepts join.
   */
  async listByCondominiumId(condominiumId: string): Promise<TQuota[]> {
    const conceptIds = this.db
      .select({ id: paymentConcepts.id })
      .from(paymentConcepts)
      .where(eq(paymentConcepts.condominiumId, condominiumId))

    const results = await this.db
      .select()
      .from(quotas)
      .where(inArray(quotas.paymentConceptId, conceptIds))
      .orderBy(desc(quotas.createdAt))
    return results.map(record => this.mapToEntity(record))
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
    options: {
      page?: number
      limit?: number
      startDate?: string
      endDate?: string
      status?: string
      conceptId?: string
    },
    condominiumId?: string
  ): Promise<TPaginatedResponse<TQuota>> {
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const offset = (page - 1) * limit

    const conditions: SQL[] = [eq(quotas.unitId, unitId)]

    if (condominiumId) {
      conditions.push(eq(paymentConcepts.condominiumId, condominiumId))
    }
    if (options.startDate) {
      conditions.push(gte(quotas.issueDate, options.startDate))
    }
    if (options.endDate) {
      conditions.push(lte(quotas.issueDate, options.endDate))
    }
    if (options.status) {
      conditions.push(eq(quotas.status, options.status as TQuota['status']))
    }
    if (options.conceptId) {
      conditions.push(eq(quotas.paymentConceptId, options.conceptId))
    }

    const whereClause = and(...conditions)

    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(quotas)
      .leftJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
      .where(whereClause)

    const total = countResult[0]?.count ?? 0

    const results = await this.db
      .select({
        quota: quotas,
        conceptName: paymentConcepts.name,
        currencyCode: currencies.code,
        currencySymbol: currencies.symbol,
        currencyName: currencies.name,
      })
      .from(quotas)
      .leftJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
      .leftJoin(currencies, eq(quotas.currencyId, currencies.id))
      .where(whereClause)
      .orderBy(asc(quotas.dueDate))
      .limit(limit)
      .offset(offset)

    const totalPages = Math.ceil(total / limit)

    const data = results.map(r => ({
      ...this.mapToEntity(r.quota),
      paymentConcept: r.conceptName ? { name: r.conceptName } : undefined,
      currency: r.currencyCode
        ? { code: r.currencyCode, symbol: r.currencySymbol, name: r.currencyName }
        : undefined,
    })) as TQuota[]

    return { data, pagination: { page, limit, total, totalPages } }
  }

  /**
   * Returns distinct payment concepts that have quotas for a given unit.
   */
  async getDistinctConceptsByUnit(
    unitId: string,
    condominiumId?: string
  ): Promise<Array<{ id: string; name: string }>> {
    const conditions: SQL[] = [eq(quotas.unitId, unitId)]

    if (condominiumId) {
      conditions.push(eq(paymentConcepts.condominiumId, condominiumId))
    }

    const results = await this.db
      .selectDistinct({
        id: paymentConcepts.id,
        name: paymentConcepts.name,
      })
      .from(quotas)
      .innerJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
      .where(and(...conditions))
      .orderBy(asc(paymentConcepts.name))

    return results.map(r => ({ id: r.id, name: r.name }))
  }

  /**
   * Retrieves quotas by unit.
   */
  async getByUnitId(unitId: string, condominiumId?: string): Promise<TQuota[]> {
    const conditions: SQL[] = [eq(quotas.unitId, unitId)]

    if (condominiumId) {
      const conceptIds = this.db
        .select({ id: paymentConcepts.id })
        .from(paymentConcepts)
        .where(eq(paymentConcepts.condominiumId, condominiumId))
      conditions.push(inArray(quotas.paymentConceptId, conceptIds))
    }

    const results = await this.db
      .select({
        quota: quotas,
        conceptName: paymentConcepts.name,
        currencyCode: currencies.code,
        currencySymbol: currencies.symbol,
        currencyName: currencies.name,
      })
      .from(quotas)
      .leftJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
      .leftJoin(currencies, eq(quotas.currencyId, currencies.id))
      .where(and(...conditions))

    return results.map(r => ({
      ...this.mapToEntity(r.quota),
      paymentConcept: r.conceptName ? { name: r.conceptName } : undefined,
      currency: r.currencyCode
        ? { code: r.currencyCode, symbol: r.currencySymbol, name: r.currencyName }
        : undefined,
    })) as TQuota[]
  }

  /**
   * Retrieves quotas by status.
   */
  async getByStatus(status: TQuota['status'], condominiumId?: string): Promise<TQuota[]> {
    const conditions: SQL[] = [eq(quotas.status, status)]
    if (condominiumId) {
      const conceptIds = this.db
        .select({ id: paymentConcepts.id })
        .from(paymentConcepts)
        .where(eq(paymentConcepts.condominiumId, condominiumId))
      conditions.push(inArray(quotas.paymentConceptId, conceptIds))
    }

    const results = await this.db
      .select()
      .from(quotas)
      .where(and(...conditions))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves pending quotas for a unit.
   */
  async getPendingByUnit(unitId: string, condominiumId?: string): Promise<TQuota[]> {
    const conditions: SQL[] = [eq(quotas.unitId, unitId), eq(quotas.status, 'pending')]

    if (condominiumId) {
      const conceptIds = this.db
        .select({ id: paymentConcepts.id })
        .from(paymentConcepts)
        .where(eq(paymentConcepts.condominiumId, condominiumId))
      conditions.push(inArray(quotas.paymentConceptId, conceptIds))
    }

    const results = await this.db
      .select()
      .from(quotas)
      .where(and(...conditions))
      .orderBy(desc(quotas.dueDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves unpaid quotas for a specific concept and unit, ordered by due date (oldest first).
   */
  async getUnpaidByConceptAndUnit(paymentConceptId: string, unitId: string): Promise<TQuota[]> {
    const results = await this.db
      .select()
      .from(quotas)
      .where(
        and(
          eq(quotas.paymentConceptId, paymentConceptId),
          eq(quotas.unitId, unitId),
          or(eq(quotas.status, 'pending'), eq(quotas.status, 'overdue'))
        )
      )
      .orderBy(asc(quotas.dueDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Batch: retrieves unpaid quotas for multiple concepts and a unit in a single query.
   */
  async getUnpaidByConceptsAndUnit(conceptIds: string[], unitId: string): Promise<TQuota[]> {
    if (conceptIds.length === 0) return []

    const results = await this.db
      .select()
      .from(quotas)
      .where(
        and(
          inArray(quotas.paymentConceptId, conceptIds),
          eq(quotas.unitId, unitId),
          or(eq(quotas.status, 'pending'), eq(quotas.status, 'overdue'))
        )
      )
      .orderBy(asc(quotas.dueDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves overdue quotas (pending, partial, or already marked overdue, with due date in the past).
   */
  async getOverdue(asOfDate: string, condominiumId?: string): Promise<TQuota[]> {
    const conditions: SQL[] = [
      or(eq(quotas.status, 'pending'), eq(quotas.status, 'partial'), eq(quotas.status, 'overdue'))!,
      lte(quotas.dueDate, asOfDate),
    ]
    if (condominiumId) {
      const conceptIds = this.db
        .select({ id: paymentConcepts.id })
        .from(paymentConcepts)
        .where(eq(paymentConcepts.condominiumId, condominiumId))
      conditions.push(inArray(quotas.paymentConceptId, conceptIds))
    }

    const results = await this.db
      .select()
      .from(quotas)
      .where(and(...conditions))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Marks all pending/partial quotas past due date as overdue in a single query.
   * Returns the number of rows updated.
   */
  async markOverdue(asOfDate: string): Promise<number> {
    const results = await this.db
      .update(quotas)
      .set({ status: 'overdue', updatedAt: new Date() })
      .where(
        and(
          or(eq(quotas.status, 'pending'), eq(quotas.status, 'partial')),
          lte(quotas.dueDate, asOfDate)
        )
      )
      .returning()

    return results.length
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
          eq(quotas.periodMonth, month),
          notInArray(quotas.status, ['cancelled', 'exonerated'])
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
  async getByPeriod(year: number, month?: number, condominiumId?: string): Promise<TQuota[]> {
    const conditions: SQL[] = [eq(quotas.periodYear, year)]

    if (month !== undefined) {
      conditions.push(eq(quotas.periodMonth, month))
    }
    if (condominiumId) {
      const conceptIds = this.db
        .select({ id: paymentConcepts.id })
        .from(paymentConcepts)
        .where(eq(paymentConcepts.condominiumId, condominiumId))
      conditions.push(inArray(quotas.paymentConceptId, conceptIds))
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

  /**
   * Retrieves a single quota with related concept, currency, and unit info.
   */
  async getByIdWithRelations(id: string): Promise<TQuota | null> {
    const results = await this.db
      .select({
        quota: quotas,
        conceptName: paymentConcepts.name,
        conceptType: paymentConcepts.conceptType,
        conceptIsRecurring: paymentConcepts.isRecurring,
        conceptRecurrencePeriod: paymentConcepts.recurrencePeriod,
        conceptLatePaymentType: paymentConcepts.latePaymentType,
        conceptLatePaymentValue: paymentConcepts.latePaymentValue,
        conceptEarlyPaymentType: paymentConcepts.earlyPaymentType,
        conceptEarlyPaymentValue: paymentConcepts.earlyPaymentValue,
        conceptEarlyPaymentDaysBeforeDue: paymentConcepts.earlyPaymentDaysBeforeDue,
        conceptDescription: paymentConcepts.description,
        currencyCode: currencies.code,
        currencySymbol: currencies.symbol,
        currencyName: currencies.name,
        unitNumber: units.unitNumber,
        unitFloor: units.floor,
        buildingName: buildings.name,
      })
      .from(quotas)
      .leftJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
      .leftJoin(currencies, eq(quotas.currencyId, currencies.id))
      .leftJoin(units, eq(quotas.unitId, units.id))
      .leftJoin(buildings, eq(units.buildingId, buildings.id))
      .where(eq(quotas.id, id))
      .limit(1)

    if (results.length === 0) return null

    const r = results[0]!
    return {
      ...this.mapToEntity(r.quota),
      paymentConcept: r.conceptName
        ? {
            name: r.conceptName,
            conceptType: r.conceptType,
            isRecurring: r.conceptIsRecurring,
            recurrencePeriod: r.conceptRecurrencePeriod,
            latePaymentType: r.conceptLatePaymentType,
            latePaymentValue: r.conceptLatePaymentValue,
            earlyPaymentType: r.conceptEarlyPaymentType,
            earlyPaymentValue: r.conceptEarlyPaymentValue,
            earlyPaymentDaysBeforeDue: r.conceptEarlyPaymentDaysBeforeDue,
            description: r.conceptDescription,
          }
        : undefined,
      currency: r.currencyCode
        ? { code: r.currencyCode, symbol: r.currencySymbol, name: r.currencyName }
        : undefined,
      unit: r.unitNumber
        ? {
            unitNumber: r.unitNumber,
            floor: r.unitFloor,
            building: r.buildingName ? { name: r.buildingName } : undefined,
          }
        : undefined,
    } as TQuota
  }
}
