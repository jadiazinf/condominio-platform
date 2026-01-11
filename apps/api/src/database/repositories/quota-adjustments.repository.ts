import { eq, desc } from 'drizzle-orm'
import type { TQuotaAdjustment, TQuotaAdjustmentCreate } from '@packages/domain'
import { quotaAdjustments } from '@database/drizzle/schema'
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
  async getByQuotaId(quotaId: string): Promise<TQuotaAdjustment[]> {
    const records = await this.db
      .select()
      .from(quotaAdjustments)
      .where(eq(quotaAdjustments.quotaId, quotaId))
      .orderBy(desc(quotaAdjustments.createdAt))

    return records.map(record => this.mapToEntity(record))
  }

  /**
   * Gets all adjustments created by a specific user.
   */
  async getByCreatedBy(userId: string): Promise<TQuotaAdjustment[]> {
    const records = await this.db
      .select()
      .from(quotaAdjustments)
      .where(eq(quotaAdjustments.createdBy, userId))
      .orderBy(desc(quotaAdjustments.createdAt))

    return records.map(record => this.mapToEntity(record))
  }

  /**
   * Gets all adjustments by type.
   */
  async getByType(adjustmentType: TQuotaAdjustment['adjustmentType']): Promise<TQuotaAdjustment[]> {
    const records = await this.db
      .select()
      .from(quotaAdjustments)
      .where(eq(quotaAdjustments.adjustmentType, adjustmentType))
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
}
