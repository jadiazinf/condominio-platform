import { and, eq, desc, gte, lte } from 'drizzle-orm'
import type { TPayment, TPaymentCreate, TPaymentUpdate } from '@packages/domain'
import { payments } from '@database/drizzle/schema'
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

  protected mapToInsertValues(dto: TPaymentCreate): Record<string, unknown> {
    return {
      paymentNumber: dto.paymentNumber,
      userId: dto.userId,
      unitId: dto.unitId,
      amount: dto.amount,
      currencyId: dto.currencyId,
      paidAmount: dto.paidAmount,
      paidCurrencyId: dto.paidCurrencyId,
      exchangeRate: dto.exchangeRate,
      paymentMethod: dto.paymentMethod,
      paymentGatewayId: dto.paymentGatewayId,
      paymentDetails: dto.paymentDetails,
      paymentDate: dto.paymentDate,
      status: dto.status,
      receiptUrl: dto.receiptUrl,
      receiptNumber: dto.receiptNumber,
      notes: dto.notes,
      metadata: dto.metadata,
      registeredBy: dto.registeredBy,
    }
  }

  protected mapToUpdateValues(dto: TPaymentUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.paymentNumber !== undefined) values.paymentNumber = dto.paymentNumber
    if (dto.userId !== undefined) values.userId = dto.userId
    if (dto.unitId !== undefined) values.unitId = dto.unitId
    if (dto.amount !== undefined) values.amount = dto.amount
    if (dto.currencyId !== undefined) values.currencyId = dto.currencyId
    if (dto.paidAmount !== undefined) values.paidAmount = dto.paidAmount
    if (dto.paidCurrencyId !== undefined) values.paidCurrencyId = dto.paidCurrencyId
    if (dto.exchangeRate !== undefined) values.exchangeRate = dto.exchangeRate
    if (dto.paymentMethod !== undefined) values.paymentMethod = dto.paymentMethod
    if (dto.paymentGatewayId !== undefined) values.paymentGatewayId = dto.paymentGatewayId
    if (dto.paymentDetails !== undefined) values.paymentDetails = dto.paymentDetails
    if (dto.paymentDate !== undefined) values.paymentDate = dto.paymentDate
    if (dto.status !== undefined) values.status = dto.status
    if (dto.receiptUrl !== undefined) values.receiptUrl = dto.receiptUrl
    if (dto.receiptNumber !== undefined) values.receiptNumber = dto.receiptNumber
    if (dto.notes !== undefined) values.notes = dto.notes
    if (dto.metadata !== undefined) values.metadata = dto.metadata
    if (dto.registeredBy !== undefined) values.registeredBy = dto.registeredBy

    return values
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
}
