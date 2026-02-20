import { and, eq, desc, sql, count } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { TNotification, TNotificationCreate, TNotificationUpdate, TPaginatedResponse } from '@packages/domain'
import { notifications } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TNotificationRecord = typeof notifications.$inferSelect

/**
 * Repository for managing notification entities.
 * Uses hard delete since notifications don't have isActive.
 */
export class NotificationsRepository
  extends BaseRepository<
    typeof notifications,
    TNotification,
    TNotificationCreate,
    TNotificationUpdate
  >
  implements IRepositoryWithHardDelete<TNotification, TNotificationCreate, TNotificationUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, notifications)
  }

  protected mapToEntity(record: unknown): TNotification {
    const r = record as TNotificationRecord
    return {
      id: r.id,
      userId: r.userId,
      templateId: r.templateId,
      category: r.category as TNotification['category'],
      title: r.title,
      body: r.body,
      priority: (r.priority ?? 'normal') as TNotification['priority'],
      data: r.data as Record<string, unknown> | null,
      isRead: r.isRead ?? false,
      readAt: r.readAt,
      expiresAt: r.expiresAt,
      metadata: r.metadata as Record<string, unknown> | null,
      createdAt: r.createdAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TNotificationCreate): Record<string, unknown> {
    return {
      userId: dto.userId,
      templateId: dto.templateId,
      category: dto.category,
      title: dto.title,
      body: dto.body,
      priority: dto.priority,
      data: dto.data,
      isRead: dto.isRead,
      expiresAt: dto.expiresAt,
      metadata: dto.metadata,
    }
  }

  protected mapToUpdateValues(dto: TNotificationUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.isRead !== undefined) values.isRead = dto.isRead
    if (dto.readAt !== undefined) values.readAt = dto.readAt

    return values
  }

  /**
   * Override listAll since notifications don't have isActive.
   */
  override async listAll(): Promise<TNotification[]> {
    const results = await this.db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Override delete to use hard delete.
   */
  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  /**
   * Retrieves notifications for a user.
   */
  async getByUserId(userId: string): Promise<TNotification[]> {
    const results = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves unread notifications for a user.
   */
  async getUnreadByUserId(userId: string): Promise<TNotification[]> {
    const results = await this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .orderBy(desc(notifications.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Gets the count of unread notifications for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    const results = await this.db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))

    return results[0]?.count ?? 0
  }

  /**
   * Marks a notification as read.
   */
  async markAsRead(id: string): Promise<TNotification | null> {
    const results = await this.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Marks all notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<number> {
    const results = await this.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .returning()

    return results.length
  }

  /**
   * Retrieves notifications by category for a user.
   */
  async getByUserIdAndCategory(
    userId: string,
    category: TNotification['category']
  ): Promise<TNotification[]> {
    const results = await this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.category, category)))
      .orderBy(desc(notifications.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves notifications by template for a user.
   */
  async getByTemplateId(templateId: string): Promise<TNotification[]> {
    const results = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.templateId, templateId))
      .orderBy(desc(notifications.createdAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves paginated notifications for a user with optional filters.
   */
  async listPaginatedByUserId(
    userId: string,
    options: { page?: number; limit?: number; category?: 'payment' | 'quota' | 'announcement' | 'reminder' | 'alert' | 'system'; isRead?: boolean }
  ): Promise<TPaginatedResponse<TNotification>> {
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const offset = (page - 1) * limit

    const conditions: SQL[] = [eq(notifications.userId, userId)]
    if (options.category) {
      conditions.push(eq(notifications.category, options.category))
    }
    if (options.isRead !== undefined) {
      conditions.push(eq(notifications.isRead, options.isRead))
    }

    const whereClause = and(...conditions)

    const results = await this.db
      .select()
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset)

    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(whereClause)

    const total = countResult[0]?.count ?? 0

    return {
      data: results.map(record => this.mapToEntity(record)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  /**
   * Deletes expired notifications.
   */
  async deleteExpired(): Promise<number> {
    const results = await this.db
      .delete(notifications)
      .where(sql`${notifications.expiresAt} IS NOT NULL AND ${notifications.expiresAt} < NOW()`)
      .returning()

    return results.length
  }
}
