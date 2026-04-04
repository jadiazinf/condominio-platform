import { and, eq, desc, gte, lte, sql, inArray, type SQL } from 'drizzle-orm'
import type { TPayment, TPaymentCreate, TPaymentUpdate, TPaginatedResponse } from '@packages/domain'
import {
  payments,
  units,
  buildings,
  currencies,
} from '../drizzle/schema'
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
      billingReceiptId: r.billingReceiptId ?? null,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  /**
   * Retrieves payments scoped to a condominium via unit → building → condominium.
   */
  async listByCondominiumId(condominiumId: string): Promise<TPayment[]> {
    const condominiumUnitIds = this.db
      .select({ id: units.id })
      .from(units)
      .innerJoin(buildings, eq(units.buildingId, buildings.id))
      .where(eq(buildings.condominiumId, condominiumId))

    const results = await this.db
      .select()
      .from(payments)
      .where(inArray(payments.unitId, condominiumUnitIds))
      .orderBy(desc(payments.paymentDate))

    return results.map(record => this.mapToEntity(record))
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
    options: {
      page?: number
      limit?: number
      startDate?: string
      endDate?: string
      status?: string
    },
    condominiumId?: string
  ): Promise<TPaginatedResponse<TPayment>> {
    const conditions: SQL[] = [eq(payments.unitId, unitId)]

    if (condominiumId) {
      const condominiumUnitIds = this.db
        .select({ id: units.id })
        .from(units)
        .innerJoin(buildings, eq(units.buildingId, buildings.id))
        .where(eq(buildings.condominiumId, condominiumId))
      conditions.push(inArray(payments.unitId, condominiumUnitIds))
    }
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
  async getByPaymentNumber(
    paymentNumber: string,
    condominiumId?: string
  ): Promise<TPayment | null> {
    const results = await this.db
      .select()
      .from(payments)
      .where(eq(payments.paymentNumber, paymentNumber))
      .limit(1)

    if (results.length === 0) {
      return null
    }

    const payment = this.mapToEntity(results[0])

    if (condominiumId && payment.unitId) {
      const condominiumUnitIds = this.db
        .select({ id: units.id })
        .from(units)
        .innerJoin(buildings, eq(units.buildingId, buildings.id))
        .where(eq(buildings.condominiumId, condominiumId))

      const belongsResult = await this.db
        .select({ id: payments.id })
        .from(payments)
        .where(and(eq(payments.id, payment.id), inArray(payments.unitId, condominiumUnitIds)))
        .limit(1)

      if (belongsResult.length === 0) {
        return null
      }
    }

    return payment
  }

  /**
   * Retrieves payments by user.
   */
  async getByUserId(userId: string, condominiumId?: string): Promise<TPayment[]> {
    const conditions: SQL[] = [eq(payments.userId, userId)]

    if (condominiumId) {
      const condominiumUnitIds = this.db
        .select({ id: units.id })
        .from(units)
        .innerJoin(buildings, eq(units.buildingId, buildings.id))
        .where(eq(buildings.condominiumId, condominiumId))
      conditions.push(inArray(payments.unitId, condominiumUnitIds))
    }

    const results = await this.db
      .select({
        payment: payments,
        currencyCode: currencies.code,
        currencySymbol: currencies.symbol,
        currencyName: currencies.name,
      })
      .from(payments)
      .leftJoin(currencies, eq(payments.currencyId, currencies.id))
      .where(and(...conditions))
      .orderBy(desc(payments.paymentDate))

    return results.map(r => {
      const payment = this.mapToEntity(r.payment)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(payment as any).currency = r.currencyCode
        ? { code: r.currencyCode, symbol: r.currencySymbol, name: r.currencyName ?? '' }
        : undefined

      return payment
    })
  }

  /**
   * Retrieves paginated payments for a user with optional filters.
   */
  async listPaginatedByUser(
    userId: string,
    options: {
      page?: number
      limit?: number
      startDate?: string
      endDate?: string
      status?: string
    },
    condominiumId?: string
  ): Promise<TPaginatedResponse<TPayment>> {
    const conditions: SQL[] = [eq(payments.userId, userId)]

    if (condominiumId) {
      const condominiumUnitIds = this.db
        .select({ id: units.id })
        .from(units)
        .innerJoin(buildings, eq(units.buildingId, buildings.id))
        .where(eq(buildings.condominiumId, condominiumId))
      conditions.push(inArray(payments.unitId, condominiumUnitIds))
    }
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
   * Retrieves a single payment with currency and unit relations.
   */
  async getByIdWithRelations(id: string): Promise<TPayment | null> {
    const results = await this.db
      .select({
        payment: payments,
        currencyCode: currencies.code,
        currencySymbol: currencies.symbol,
        currencyName: currencies.name,
        unitNumber: units.unitNumber,
      })
      .from(payments)
      .leftJoin(currencies, eq(payments.currencyId, currencies.id))
      .leftJoin(units, eq(payments.unitId, units.id))
      .where(eq(payments.id, id))
      .limit(1)

    if (results.length === 0) return null

    const r = results[0]!
    const payment = this.mapToEntity(r.payment)
    // Attach partial relation data (only fields needed by the frontend)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(payment as any).currency = r.currencyCode
      ? { code: r.currencyCode, symbol: r.currencySymbol, name: r.currencyName ?? '' }
      : undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(payment as any).unit = r.unitNumber ? { unitNumber: r.unitNumber } : undefined

    return payment
  }

  /**
   * Retrieves paginated payments with currency and unit relations.
   */
  async listPaginatedByUserWithRelations(
    userId: string,
    options: {
      page?: number
      limit?: number
      startDate?: string
      endDate?: string
      status?: string
    },
    condominiumId?: string
  ): Promise<TPaginatedResponse<TPayment>> {
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const offset = (page - 1) * limit

    const conditions: SQL[] = [eq(payments.userId, userId)]

    if (condominiumId) {
      const condominiumUnitIds = this.db
        .select({ id: units.id })
        .from(units)
        .innerJoin(buildings, eq(units.buildingId, buildings.id))
        .where(eq(buildings.condominiumId, condominiumId))
      conditions.push(inArray(payments.unitId, condominiumUnitIds))
    }
    if (options.startDate) {
      conditions.push(gte(payments.paymentDate, options.startDate))
    }
    if (options.endDate) {
      conditions.push(lte(payments.paymentDate, options.endDate))
    }
    if (options.status) {
      conditions.push(eq(payments.status, options.status as TPayment['status']))
    }

    const whereClause = and(...conditions)

    // Count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(payments)
      .where(whereClause)
    const total = countResult[0]?.count ?? 0

    // Data with joins
    const results = await this.db
      .select({
        payment: payments,
        currencyCode: currencies.code,
        currencySymbol: currencies.symbol,
        currencyName: currencies.name,
        unitNumber: units.unitNumber,
      })
      .from(payments)
      .leftJoin(currencies, eq(payments.currencyId, currencies.id))
      .leftJoin(units, eq(payments.unitId, units.id))
      .where(whereClause)
      .orderBy(desc(payments.paymentDate))
      .limit(limit)
      .offset(offset)

    const data = results.map(r => {
      const payment = this.mapToEntity(r.payment)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(payment as any).currency = r.currencyCode
        ? { code: r.currencyCode, symbol: r.currencySymbol, name: r.currencyName ?? '' }
        : undefined
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(payment as any).unit = r.unitNumber ? { unitNumber: r.unitNumber } : undefined
      return payment
    })

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Retrieves payments by unit.
   */
  async getByUnitId(unitId: string, condominiumId?: string): Promise<TPayment[]> {
    const conditions: SQL[] = [eq(payments.unitId, unitId)]

    if (condominiumId) {
      const condominiumUnitIds = this.db
        .select({ id: units.id })
        .from(units)
        .innerJoin(buildings, eq(units.buildingId, buildings.id))
        .where(eq(buildings.condominiumId, condominiumId))
      conditions.push(inArray(payments.unitId, condominiumUnitIds))
    }

    const results = await this.db
      .select()
      .from(payments)
      .where(and(...conditions))
      .orderBy(desc(payments.paymentDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves payments by status.
   */
  async getByStatus(status: TPayment['status'], condominiumId?: string): Promise<TPayment[]> {
    const conditions: SQL[] = [eq(payments.status, status)]

    if (condominiumId) {
      const condominiumUnitIds = this.db
        .select({ id: units.id })
        .from(units)
        .innerJoin(buildings, eq(units.buildingId, buildings.id))
        .where(eq(buildings.condominiumId, condominiumId))
      conditions.push(inArray(payments.unitId, condominiumUnitIds))
    }

    const results = await this.db
      .select()
      .from(payments)
      .where(and(...conditions))
      .orderBy(desc(payments.paymentDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves payments within a date range.
   */
  async getByDateRange(
    startDate: string,
    endDate: string,
    condominiumId?: string
  ): Promise<TPayment[]> {
    const conditions: SQL[] = [
      gte(payments.paymentDate, startDate),
      lte(payments.paymentDate, endDate),
    ]

    if (condominiumId) {
      const condominiumUnitIds = this.db
        .select({ id: units.id })
        .from(units)
        .innerJoin(buildings, eq(units.buildingId, buildings.id))
        .where(eq(buildings.condominiumId, condominiumId))
      conditions.push(inArray(payments.unitId, condominiumUnitIds))
    }

    const results = await this.db
      .select()
      .from(payments)
      .where(and(...conditions))
      .orderBy(desc(payments.paymentDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves payments by receipt number (excluding rejected).
   */
  async getByReceiptNumber(receiptNumber: string): Promise<TPayment[]> {
    const results = await this.db
      .select()
      .from(payments)
      .where(and(eq(payments.receiptNumber, receiptNumber), sql`${payments.status} != 'rejected'`))
      .orderBy(desc(payments.paymentDate))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves payments with status 'pending' or 'pending_verification' for a unit.
   */
  async getPendingByUnitId(unitId: string): Promise<TPayment[]> {
    const results = await this.db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.unitId, unitId),
          inArray(payments.status, ['pending', 'pending_verification'])
        )
      )

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves payments pending verification.
   */
  async getPendingVerification(condominiumId?: string): Promise<TPayment[]> {
    const conditions: SQL[] = [eq(payments.status, 'pending_verification')]

    if (condominiumId) {
      const condominiumUnitIds = this.db
        .select({ id: units.id })
        .from(units)
        .innerJoin(buildings, eq(units.buildingId, buildings.id))
        .where(eq(buildings.condominiumId, condominiumId))
      conditions.push(inArray(payments.unitId, condominiumUnitIds))
    }

    const results = await this.db
      .select()
      .from(payments)
      .where(and(...conditions))
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

}
