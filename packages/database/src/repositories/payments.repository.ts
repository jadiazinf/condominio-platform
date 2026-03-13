import { and, eq, desc, gte, lte, sql, type SQL } from 'drizzle-orm'
import type { TPayment, TPaymentCreate, TPaymentUpdate, TPaginatedResponse } from '@packages/domain'
import { payments, paymentApplications, quotas, paymentConcepts } from '../drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TPaymentRecord = typeof payments.$inferSelect

/**
 * Repository for managing payment entities.
 * Uses status-based workflow instead of soft delete.
 */
export class PaymentsRepository
  extends BaseRepository<typeof payments, TPayment, TPaymentCreate, TPaymentUpdate>
  implements IRepositoryWithHardDelete<TPayment, TPaymentCreate, TPaymentUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, payments)
  }

  protected mapToEntity(record: unknown): TPayment {
    const r = record as TPaymentRecord
    return {
      id: r.id,
      paymentNumber: r.paymentNumber,
      userId: r.userId,
      unitId: r.unitId,
      amount: r.amount,
      currencyId: r.currencyId,
      paidAmount: r.paidAmount,
      paidCurrencyId: r.paidCurrencyId,
      exchangeRate: r.exchangeRate,
      paymentMethod: r.paymentMethod as TPayment['paymentMethod'],
      paymentGatewayId: r.paymentGatewayId,
      paymentDetails: r.paymentDetails as Record<string, unknown> | null,
      paymentDate: r.paymentDate,
      registeredAt: r.registeredAt ?? new Date(),
      status: (r.status ?? 'completed') as TPayment['status'],
      receiptUrl: r.receiptUrl,
      receiptNumber: r.receiptNumber,
      notes: r.notes,
      metadata: r.metadata as Record<string, unknown> | null,
      registeredBy: r.registeredBy,
      verifiedBy: r.verifiedBy,
      verifiedAt: r.verifiedAt,
      verificationNotes: r.verificationNotes,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  /**
   * Override listAll since payments don't have isActive.
   */
  override async listAll(): Promise<TPayment[]> {
    const results = await this.db.select().from(payments).orderBy(desc(payments.paymentDate))
    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Override delete to use hard delete.
   */
  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  /**
   * Retrieves paginated payments for a unit with optional filters.
   */
  async listPaginatedByUnit(
    unitId: string,
    options: { page?: number; limit?: number; startDate?: string; endDate?: string; status?: string }
  ): Promise<TPaginatedResponse<TPayment>> {
    const conditions: SQL[] = [eq(payments.unitId, unitId)]

    if (options.startDate) {
      conditions.push(gte(payments.paymentDate, options.startDate))
    }
    if (options.endDate) {
      conditions.push(lte(payments.paymentDate, options.endDate))
    }
    if (options.status) {
      conditions.push(eq(payments.status, options.status as TPayment['status']))
    }

    return this.listPaginated({ page: options.page, limit: options.limit }, conditions)
  }

  /**
   * Retrieves a payment by payment number.
   */
  async getByPaymentNumber(paymentNumber: string): Promise<TPayment | null> {
    const results = await this.db
      .select()
      .from(payments)
      .where(eq(payments.paymentNumber, paymentNumber))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Retrieves payments by user.
   */
  async getByUserId(userId: string): Promise<TPayment[]> {
    const results = await this.db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.paymentDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves payments by unit.
   */
  async getByUnitId(unitId: string): Promise<TPayment[]> {
    const results = await this.db
      .select()
      .from(payments)
      .where(eq(payments.unitId, unitId))
      .orderBy(desc(payments.paymentDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves payments by status.
   */
  async getByStatus(status: TPayment['status']): Promise<TPayment[]> {
    const results = await this.db
      .select()
      .from(payments)
      .where(eq(payments.status, status))
      .orderBy(desc(payments.paymentDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves payments within a date range.
   */
  async getByDateRange(startDate: string, endDate: string): Promise<TPayment[]> {
    const results = await this.db
      .select()
      .from(payments)
      .where(and(gte(payments.paymentDate, startDate), lte(payments.paymentDate, endDate)))
      .orderBy(desc(payments.paymentDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves payments pending verification.
   */
  async getPendingVerification(): Promise<TPayment[]> {
    const results = await this.db
      .select()
      .from(payments)
      .where(eq(payments.status, 'pending_verification'))
      .orderBy(desc(payments.registeredAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Verifies (approves) a payment, changing status to 'completed'.
   */
  async verifyPayment(
    id: string,
    verifiedBy: string,
    verificationNotes?: string
  ): Promise<TPayment | null> {
    const results = await this.db
      .update(payments)
      .set({
        status: 'completed',
        verifiedBy,
        verifiedAt: new Date(),
        verificationNotes: verificationNotes ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(payments.id, id), eq(payments.status, 'pending_verification')))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Rejects a payment, changing status to 'rejected'.
   */
  async rejectPayment(
    id: string,
    verifiedBy: string,
    verificationNotes?: string
  ): Promise<TPayment | null> {
    const results = await this.db
      .update(payments)
      .set({
        status: 'rejected',
        verifiedBy,
        verifiedAt: new Date(),
        verificationNotes: verificationNotes ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(payments.id, id), eq(payments.status, 'pending_verification')))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Lists paginated payments linked to reserve fund concepts for a condominium.
   */
  async listReserveFundPaymentsPaginated(
    condominiumId: string,
    options: {
      page?: number
      limit?: number
      unitId?: string
      conceptId?: string
      startDate?: string
      endDate?: string
    }
  ): Promise<TPaginatedResponse<TPayment>> {
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const offset = (page - 1) * limit

    const conditions: SQL[] = [
      eq(paymentConcepts.condominiumId, condominiumId),
      eq(paymentConcepts.conceptType, 'reserve_fund'),
    ]

    if (options.unitId) {
      conditions.push(eq(payments.unitId, options.unitId))
    }
    if (options.conceptId) {
      conditions.push(eq(paymentConcepts.id, options.conceptId))
    }
    if (options.startDate) {
      conditions.push(gte(payments.paymentDate, options.startDate))
    }
    if (options.endDate) {
      conditions.push(lte(payments.paymentDate, options.endDate))
    }

    const whereClause = and(...conditions)

    // Use a subquery to get distinct payment IDs with correct pagination
    const paymentIdsResult = await this.db
      .selectDistinct({ id: payments.id, paymentDate: payments.paymentDate })
      .from(payments)
      .innerJoin(paymentApplications, eq(paymentApplications.paymentId, payments.id))
      .innerJoin(quotas, eq(paymentApplications.quotaId, quotas.id))
      .innerJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
      .where(whereClause)
      .orderBy(desc(payments.paymentDate))
      .limit(limit)
      .offset(offset)

    const countResult = await this.db
      .select({ count: sql<number>`COUNT(DISTINCT ${payments.id})::int` })
      .from(payments)
      .innerJoin(paymentApplications, eq(paymentApplications.paymentId, payments.id))
      .innerJoin(quotas, eq(paymentApplications.quotaId, quotas.id))
      .innerJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
      .where(whereClause)

    const total = countResult[0]?.count ?? 0

    if (paymentIdsResult.length === 0) {
      return { data: [], pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
    }

    // Fetch full payment records for the page
    const paymentIds = paymentIdsResult.map(r => r.id)
    const results = await this.db
      .select()
      .from(payments)
      .where(sql`${payments.id} IN (${sql.join(paymentIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(desc(payments.paymentDate))

    return {
      data: results.map(record => this.mapToEntity(record)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }
}
