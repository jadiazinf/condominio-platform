import { and, eq, desc, lt } from 'drizzle-orm'
import type {
  TNotificationDelivery,
  TNotificationDeliveryCreate,
  TNotificationDeliveryUpdate,
} from '@packages/domain'
import { notificationDeliveries } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TNotificationDeliveryRecord = typeof notificationDeliveries.$inferSelect

/**
 * Repository for managing notification delivery entities.
 * Uses hard delete since deliveries don't have isActive.
 */
export class NotificationDeliveriesRepository
  extends BaseRepository<
    typeof notificationDeliveries,
    TNotificationDelivery,
    TNotificationDeliveryCreate,
    TNotificationDeliveryUpdate
  >
  implements
    IRepositoryWithHardDelete<
      TNotificationDelivery,
      TNotificationDeliveryCreate,
      TNotificationDeliveryUpdate
    >
{
  constructor(db: TDrizzleClient) {
    super(db, notificationDeliveries)
  }

  protected mapToEntity(record: unknown): TNotificationDelivery {
    const r = record as TNotificationDeliveryRecord
    return {
      id: r.id,
      notificationId: r.notificationId,
      channel: r.channel as TNotificationDelivery['channel'],
      status: (r.status ?? 'pending') as TNotificationDelivery['status'],
      sentAt: r.sentAt,
      deliveredAt: r.deliveredAt,
      failedAt: r.failedAt,
      errorMessage: r.errorMessage,
      retryCount: r.retryCount ?? 0,
      externalId: r.externalId,
      metadata: r.metadata as Record<string, unknown> | null,
      createdAt: r.createdAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TNotificationDeliveryCreate): Record<string, unknown> {
    return {
      notificationId: dto.notificationId,
      channel: dto.channel,
      status: dto.status,
      sentAt: dto.sentAt,
      deliveredAt: dto.deliveredAt,
      failedAt: dto.failedAt,
      errorMessage: dto.errorMessage,
      retryCount: dto.retryCount,
      externalId: dto.externalId,
      metadata: dto.metadata,
    }
  }

  protected mapToUpdateValues(dto: TNotificationDeliveryUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.notificationId !== undefined) values.notificationId = dto.notificationId
    if (dto.channel !== undefined) values.channel = dto.channel
    if (dto.status !== undefined) values.status = dto.status
    if (dto.sentAt !== undefined) values.sentAt = dto.sentAt
    if (dto.deliveredAt !== undefined) values.deliveredAt = dto.deliveredAt
    if (dto.failedAt !== undefined) values.failedAt = dto.failedAt
    if (dto.errorMessage !== undefined) values.errorMessage = dto.errorMessage
    if (dto.retryCount !== undefined) values.retryCount = dto.retryCount
    if (dto.externalId !== undefined) values.externalId = dto.externalId
    if (dto.metadata !== undefined) values.metadata = dto.metadata

    return values
  }

  /**
   * Override listAll since deliveries don't have isActive.
   */
  override async listAll(): Promise<TNotificationDelivery[]> {
    const results = await this.db
      .select()
      .from(notificationDeliveries)
      .orderBy(desc(notificationDeliveries.createdAt))
    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Override delete to use hard delete.
   */
  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  /**
   * Retrieves deliveries for a notification.
   */
  async getByNotificationId(notificationId: string): Promise<TNotificationDelivery[]> {
    const results = await this.db
      .select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.notificationId, notificationId))
      .orderBy(desc(notificationDeliveries.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves delivery by notification and channel.
   */
  async getByNotificationAndChannel(
    notificationId: string,
    channel: TNotificationDelivery['channel']
  ): Promise<TNotificationDelivery | null> {
    const results = await this.db
      .select()
      .from(notificationDeliveries)
      .where(
        and(
          eq(notificationDeliveries.notificationId, notificationId),
          eq(notificationDeliveries.channel, channel)
        )
      )
      .limit(1)

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Retrieves deliveries by status.
   */
  async getByStatus(status: TNotificationDelivery['status']): Promise<TNotificationDelivery[]> {
    const results = await this.db
      .select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.status, status))
      .orderBy(desc(notificationDeliveries.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves pending deliveries for retry.
   */
  async getPendingForRetry(maxRetries: number = 3): Promise<TNotificationDelivery[]> {
    const results = await this.db
      .select()
      .from(notificationDeliveries)
      .where(
        and(
          eq(notificationDeliveries.status, 'pending'),
          lt(notificationDeliveries.retryCount, maxRetries)
        )
      )
      .orderBy(notificationDeliveries.createdAt)

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Marks a delivery as sent.
   */
  async markAsSent(id: string, externalId?: string): Promise<TNotificationDelivery | null> {
    const updateData: Record<string, unknown> = {
      status: 'sent',
      sentAt: new Date(),
    }
    if (externalId) {
      updateData.externalId = externalId
    }

    const results = await this.db
      .update(notificationDeliveries)
      .set(updateData)
      .where(eq(notificationDeliveries.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Marks a delivery as delivered.
   */
  async markAsDelivered(id: string): Promise<TNotificationDelivery | null> {
    const results = await this.db
      .update(notificationDeliveries)
      .set({ status: 'delivered', deliveredAt: new Date() })
      .where(eq(notificationDeliveries.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Marks a delivery as failed.
   */
  async markAsFailed(id: string, errorMessage: string): Promise<TNotificationDelivery | null> {
    const existing = await this.getById(id)
    if (!existing) return null

    const results = await this.db
      .update(notificationDeliveries)
      .set({
        status: 'failed',
        failedAt: new Date(),
        errorMessage,
        retryCount: existing.retryCount + 1,
      })
      .where(eq(notificationDeliveries.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Retrieves deliveries by channel.
   */
  async getByChannel(channel: TNotificationDelivery['channel']): Promise<TNotificationDelivery[]> {
    const results = await this.db
      .select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.channel, channel))
      .orderBy(desc(notificationDeliveries.createdAt))

    return results.map(record => this.mapToEntity(record))
  }
}
