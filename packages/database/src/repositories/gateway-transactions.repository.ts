import { eq, and, inArray, lt, desc } from 'drizzle-orm'
import type {
  TGatewayTransaction,
  TGatewayTransactionCreate,
  TGatewayTransactionUpdate,
} from '@packages/domain'
import { gatewayTransactions } from '../drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TGatewayTransactionRecord = typeof gatewayTransactions.$inferSelect

/**
 * Repository for managing gateway transaction entities.
 * Tracks interactions with external payment gateways for audit and verification.
 *
 * Retry support: The `getPendingVerification()` and `incrementAttempts()` methods
 * are designed for a background worker that polls the gateway for async transactions.
 * The worker should:
 *   1. Call `getPendingVerification(maxAttempts)` to get retryable transactions
 *   2. For each, call `adapter.getTransactionStatus()` via the gateway manager
 *   3. If completed → `markVerified()`. If failed → `markFailed()`.
 *   4. Otherwise → `incrementAttempts()` for the next retry cycle.
 */
export class GatewayTransactionsRepository
  extends BaseRepository<
    typeof gatewayTransactions,
    TGatewayTransaction,
    TGatewayTransactionCreate,
    TGatewayTransactionUpdate
  >
  implements IRepository<TGatewayTransaction, TGatewayTransactionCreate, TGatewayTransactionUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, gatewayTransactions)
  }

  protected mapToEntity(record: unknown): TGatewayTransaction {
    const r = record as TGatewayTransactionRecord
    return {
      id: r.id,
      paymentId: r.paymentId,
      gatewayType: r.gatewayType as TGatewayTransaction['gatewayType'],
      externalTransactionId: r.externalTransactionId,
      externalReference: r.externalReference,
      requestPayload: r.requestPayload as Record<string, unknown> | null,
      responsePayload: r.responsePayload as Record<string, unknown> | null,
      status: r.status as TGatewayTransaction['status'],
      attempts: r.attempts,
      maxAttempts: r.maxAttempts,
      lastAttemptAt: r.lastAttemptAt,
      verifiedAt: r.verifiedAt,
      errorMessage: r.errorMessage,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected override mapToInsertValues(dto: TGatewayTransactionCreate): Record<string, unknown> {
    return {
      paymentId: dto.paymentId,
      gatewayType: dto.gatewayType,
      externalTransactionId: dto.externalTransactionId,
      externalReference: dto.externalReference,
      requestPayload: dto.requestPayload,
      responsePayload: dto.responsePayload,
      status: dto.status,
      attempts: dto.attempts,
      maxAttempts: dto.maxAttempts,
      lastAttemptAt: dto.lastAttemptAt,
      verifiedAt: dto.verifiedAt,
      errorMessage: dto.errorMessage,
    }
  }

  protected override mapToUpdateValues(dto: TGatewayTransactionUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.externalTransactionId !== undefined)
      values.externalTransactionId = dto.externalTransactionId
    if (dto.externalReference !== undefined) values.externalReference = dto.externalReference
    if (dto.requestPayload !== undefined) values.requestPayload = dto.requestPayload
    if (dto.responsePayload !== undefined) values.responsePayload = dto.responsePayload
    if (dto.status !== undefined) values.status = dto.status
    if (dto.attempts !== undefined) values.attempts = dto.attempts
    if (dto.lastAttemptAt !== undefined) values.lastAttemptAt = dto.lastAttemptAt
    if (dto.verifiedAt !== undefined) values.verifiedAt = dto.verifiedAt
    if (dto.errorMessage !== undefined) values.errorMessage = dto.errorMessage

    return values
  }

  /**
   * Retrieves all gateway transactions for a payment.
   */
  async getByPaymentId(paymentId: string): Promise<TGatewayTransaction[]> {
    const results = await this.db
      .select()
      .from(gatewayTransactions)
      .where(eq(gatewayTransactions.paymentId, paymentId))
      .orderBy(desc(gatewayTransactions.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves a gateway transaction by external reference.
   */
  async getByExternalReference(reference: string): Promise<TGatewayTransaction | null> {
    const results = await this.db
      .select()
      .from(gatewayTransactions)
      .where(eq(gatewayTransactions.externalReference, reference))
      .limit(1)

    if (results.length === 0) return null
    return this.mapToEntity(results[0])
  }

  /**
   * Retrieves a gateway transaction by external transaction ID.
   * Used by webhook processing to match incoming bank references against
   * the ID returned when the transaction was initiated (e.g. BNC IdTransaction).
   */
  async getByExternalTransactionId(
    externalTransactionId: string
  ): Promise<TGatewayTransaction | null> {
    const results = await this.db
      .select()
      .from(gatewayTransactions)
      .where(eq(gatewayTransactions.externalTransactionId, externalTransactionId))
      .limit(1)

    if (results.length === 0) return null
    return this.mapToEntity(results[0])
  }

  /**
   * Retrieves transactions pending verification (for retry scenarios).
   */
  async getPendingVerification(maxAttempts: number): Promise<TGatewayTransaction[]> {
    const results = await this.db
      .select()
      .from(gatewayTransactions)
      .where(
        and(
          inArray(gatewayTransactions.status, ['initiated', 'processing']),
          lt(gatewayTransactions.attempts, maxAttempts)
        )
      )
      .orderBy(desc(gatewayTransactions.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Increments the attempt count and updates lastAttemptAt.
   */
  async incrementAttempts(id: string): Promise<TGatewayTransaction | null> {
    const results = await this.db
      .update(gatewayTransactions)
      .set({
        attempts: (await this.getById(id))!.attempts + 1,
        lastAttemptAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(gatewayTransactions.id, id))
      .returning()

    if (results.length === 0) return null
    return this.mapToEntity(results[0])
  }

  /**
   * Marks a transaction as verified/completed.
   */
  async markVerified(
    id: string,
    externalTransactionId?: string
  ): Promise<TGatewayTransaction | null> {
    const updateData: Record<string, unknown> = {
      status: 'completed',
      verifiedAt: new Date(),
      updatedAt: new Date(),
    }

    if (externalTransactionId) {
      updateData.externalTransactionId = externalTransactionId
    }

    const results = await this.db
      .update(gatewayTransactions)
      .set(updateData)
      .where(eq(gatewayTransactions.id, id))
      .returning()

    if (results.length === 0) return null
    return this.mapToEntity(results[0])
  }

  /**
   * Marks a transaction as failed.
   */
  async markFailed(id: string, errorMessage: string): Promise<TGatewayTransaction | null> {
    const results = await this.db
      .update(gatewayTransactions)
      .set({
        status: 'failed',
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(gatewayTransactions.id, id))
      .returning()

    if (results.length === 0) return null
    return this.mapToEntity(results[0])
  }
}
