import { and, eq, desc } from 'drizzle-orm'
import type { TMessage, TMessageCreate, TMessageUpdate } from '@packages/domain'
import { messages } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepositoryWithHardDelete } from './interfaces'
import { BaseRepository } from './base'

type TMessageRecord = typeof messages.$inferSelect

/**
 * Repository for managing message entities.
 * Uses hard delete since messages don't have isActive.
 */
export class MessagesRepository
  extends BaseRepository<typeof messages, TMessage, TMessageCreate, TMessageUpdate>
  implements IRepositoryWithHardDelete<TMessage, TMessageCreate, TMessageUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, messages)
  }

  protected mapToEntity(record: unknown): TMessage {
    const r = record as TMessageRecord
    return {
      id: r.id,
      senderId: r.senderId,
      recipientType: r.recipientType as TMessage['recipientType'],
      recipientUserId: r.recipientUserId,
      recipientCondominiumId: r.recipientCondominiumId,
      recipientBuildingId: r.recipientBuildingId,
      recipientUnitId: r.recipientUnitId,
      subject: r.subject,
      body: r.body,
      messageType: (r.messageType ?? 'message') as TMessage['messageType'],
      priority: (r.priority ?? 'normal') as TMessage['priority'],
      attachments: r.attachments as Record<string, unknown> | null,
      isRead: r.isRead ?? false,
      readAt: r.readAt,
      metadata: r.metadata as Record<string, unknown> | null,
      registeredBy: r.registeredBy,
      sentAt: r.sentAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TMessageCreate): Record<string, unknown> {
    return {
      senderId: dto.senderId,
      recipientType: dto.recipientType,
      recipientUserId: dto.recipientUserId,
      recipientCondominiumId: dto.recipientCondominiumId,
      recipientBuildingId: dto.recipientBuildingId,
      recipientUnitId: dto.recipientUnitId,
      subject: dto.subject,
      body: dto.body,
      messageType: dto.messageType,
      priority: dto.priority,
      attachments: dto.attachments,
      isRead: dto.isRead,
      readAt: dto.readAt,
      metadata: dto.metadata,
      registeredBy: dto.registeredBy,
    }
  }

  protected mapToUpdateValues(dto: TMessageUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.senderId !== undefined) values.senderId = dto.senderId
    if (dto.recipientType !== undefined) values.recipientType = dto.recipientType
    if (dto.recipientUserId !== undefined) values.recipientUserId = dto.recipientUserId
    if (dto.recipientCondominiumId !== undefined)
      values.recipientCondominiumId = dto.recipientCondominiumId
    if (dto.recipientBuildingId !== undefined) values.recipientBuildingId = dto.recipientBuildingId
    if (dto.recipientUnitId !== undefined) values.recipientUnitId = dto.recipientUnitId
    if (dto.subject !== undefined) values.subject = dto.subject
    if (dto.body !== undefined) values.body = dto.body
    if (dto.messageType !== undefined) values.messageType = dto.messageType
    if (dto.priority !== undefined) values.priority = dto.priority
    if (dto.attachments !== undefined) values.attachments = dto.attachments
    if (dto.isRead !== undefined) values.isRead = dto.isRead
    if (dto.readAt !== undefined) values.readAt = dto.readAt
    if (dto.metadata !== undefined) values.metadata = dto.metadata
    if (dto.registeredBy !== undefined) values.registeredBy = dto.registeredBy

    return values
  }

  /**
   * Override listAll since messages don't have isActive.
   */
  override async listAll(): Promise<TMessage[]> {
    const results = await this.db.select().from(messages).orderBy(desc(messages.sentAt))
    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Override delete to use hard delete.
   */
  override async delete(id: string): Promise<boolean> {
    return this.hardDelete(id)
  }

  /**
   * Retrieves messages sent by a user.
   */
  async getBySenderId(senderId: string): Promise<TMessage[]> {
    const results = await this.db
      .select()
      .from(messages)
      .where(eq(messages.senderId, senderId))
      .orderBy(desc(messages.sentAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves messages for a user (as recipient).
   */
  async getByRecipientUserId(recipientUserId: string): Promise<TMessage[]> {
    const results = await this.db
      .select()
      .from(messages)
      .where(eq(messages.recipientUserId, recipientUserId))
      .orderBy(desc(messages.sentAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves unread messages for a user.
   */
  async getUnreadByUserId(recipientUserId: string): Promise<TMessage[]> {
    const results = await this.db
      .select()
      .from(messages)
      .where(and(eq(messages.recipientUserId, recipientUserId), eq(messages.isRead, false)))
      .orderBy(desc(messages.sentAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Marks a message as read.
   */
  async markAsRead(id: string): Promise<TMessage | null> {
    const results = await this.db
      .update(messages)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(messages.id, id))
      .returning()

    if (results.length === 0) {
      return null
    }

    return this.mapToEntity(results[0])
  }

  /**
   * Retrieves messages by type.
   */
  async getByType(messageType: TMessage['messageType']): Promise<TMessage[]> {
    const results = await this.db
      .select()
      .from(messages)
      .where(eq(messages.messageType, messageType))
      .orderBy(desc(messages.sentAt))

    return results.map(record => this.mapToEntity(record))
  }

  /**
   * Retrieves messages for a condominium.
   */
  async getByCondominiumId(condominiumId: string): Promise<TMessage[]> {
    const results = await this.db
      .select()
      .from(messages)
      .where(eq(messages.recipientCondominiumId, condominiumId))
      .orderBy(desc(messages.sentAt))

    return results.map(record => this.mapToEntity(record))
  }
}
