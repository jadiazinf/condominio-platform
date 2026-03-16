import { and, eq, desc, inArray } from 'drizzle-orm'
import type { TQuotaAdjustment, TQuotaAdjustmentCreate } from '@packages/domain'
import { quotaAdjustments, quotas, paymentConcepts } from '../drizzle/schema'
import type { TDrizzleClient } from './interfaces'

type TQuotaAdjustmentRecord = typeof quotaAdjustments.$inferSelect

/**
 * Repository for managing quota adjustment entities.
 * This is a read-only repository with create capability (no updates/deletes).
 * Adjustments are immutable audit records.
 */
export class QuotaAdjustmentsRepository {
  constructor(private readonly db: TDrizzleClient) {}

  private mapToEntity(record: TQuotaAdjustmentRecord): TQuotaAdjustment {
    return {
      id: record.id,
      quotaId: record.quotaId,
      previousAmount: record.previousAmount,
      newAmount: record.newAmount,
      adjustmentType: record.adjustmentType as TQuotaAdjustment['adjustmentType'],
      reason: record.reason,
      tag: record.tag,
      createdBy: record.createdBy,
      createdAt: record.createdAt ?? new Date(),
    }
  }

  /**
   * Creates a new quota adjustment record.
   */
  async create(dto: TQuotaAdjustmentCreate): Promise<TQuotaAdjustment> {
    const [record] = await this.db
      .insert(quotaAdjustments)
      .values({
        quotaId: dto.quotaId,
        previousAmount: dto.previousAmount,
        newAmount: dto.newAmount,
        adjustmentType: dto.adjustmentType,
        reason: dto.reason,
        tag: dto.tag ?? null,
        createdBy: dto.createdBy,
      })
      .returning()

    return this.mapToEntity(record!)
  }

  /**
   * Gets an adjustment by ID.
   */
  async getById(id: string): Promise<TQuotaAdjustment | null> {
    const [record] = await this.db
      .select()
      .from(quotaAdjustments)
      .where(eq(quotaAdjustments.id, id))
      .limit(1)

    return record ? this.mapToEntity(record) : null
  }

  /**
   * Gets all adjustments for a specific quota.
   */
  async getByQuotaId(quotaId: string, condominiumId?: string): Promise<TQuotaAdjustment[]> {
    const conditions = [eq(quotaAdjustments.quotaId, quotaId)]

    if (condominiumId) {
      const condominiumQuotaIds = this.db
        .select({ id: quotas.id })
        .from(quotas)
        .innerJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
        .where(eq(paymentConcepts.condominiumId, condominiumId))

      conditions.push(inArray(quotaAdjustments.quotaId, condominiumQuotaIds))
    }

    const records = await this.db
      .select()
      .from(quotaAdjustments)
      .where(and(...conditions))
      .orderBy(desc(quotaAdjustments.createdAt))

    return records.map(record => this.mapToEntity(record))
  }

  /**
   * Gets all adjustments created by a specific user.
   */
  async getByCreatedBy(userId: string, condominiumId?: string): Promise<TQuotaAdjustment[]> {
    const conditions = [eq(quotaAdjustments.createdBy, userId)]

    if (condominiumId) {
      const condominiumQuotaIds = this.db
        .select({ id: quotas.id })
        .from(quotas)
        .innerJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
        .where(eq(paymentConcepts.condominiumId, condominiumId))

      conditions.push(inArray(quotaAdjustments.quotaId, condominiumQuotaIds))
    }

    const records = await this.db
      .select()
      .from(quotaAdjustments)
      .where(and(...conditions))
      .orderBy(desc(quotaAdjustments.createdAt))

    return records.map(record => this.mapToEntity(record))
  }

  /**
   * Gets all adjustments by type.
   */
  async getByType(
    adjustmentType: TQuotaAdjustment['adjustmentType'],
    condominiumId?: string
  ): Promise<TQuotaAdjustment[]> {
    const conditions = [eq(quotaAdjustments.adjustmentType, adjustmentType)]

    if (condominiumId) {
      const condominiumQuotaIds = this.db
        .select({ id: quotas.id })
        .from(quotas)
        .innerJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
        .where(eq(paymentConcepts.condominiumId, condominiumId))

      conditions.push(inArray(quotaAdjustments.quotaId, condominiumQuotaIds))
    }

    const records = await this.db
      .select()
      .from(quotaAdjustments)
      .where(and(...conditions))
      .orderBy(desc(quotaAdjustments.createdAt))

    return records.map(record => this.mapToEntity(record))
  }

  /**
   * Lists all adjustments.
   */
  async listAll(): Promise<TQuotaAdjustment[]> {
    const records = await this.db
      .select()
      .from(quotaAdjustments)
      .orderBy(desc(quotaAdjustments.createdAt))

    return records.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves adjustments scoped to a condominium via quota → paymentConcept → condominium.
   */
  async listByCondominiumId(condominiumId: string): Promise<TQuotaAdjustment[]> {
    const condominiumQuotaIds = this.db
      .select({ id: quotas.id })
      .from(quotas)
      .innerJoin(paymentConcepts, eq(quotas.paymentConceptId, paymentConcepts.id))
      .where(eq(paymentConcepts.condominiumId, condominiumId))

    const records = await this.db
      .select()
      .from(quotaAdjustments)
      .where(inArray(quotaAdjustments.quotaId, condominiumQuotaIds))
      .orderBy(desc(quotaAdjustments.createdAt))

    return records.map(record => this.mapToEntity(record))
  }

  /**
   * Returns a shallow clone of this repository using the given transaction client.
   * Allows multiple repositories to share the same transaction.
   */
  withTx(tx: TDrizzleClient): this {
    const clone = Object.create(Object.getPrototypeOf(this)) as this
    Object.assign(clone, this)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Drizzle withTx pattern requires cast
    ;(clone as any).db = tx
    return clone
  }
}
