import { eq, desc } from 'drizzle-orm'
import type {
  TSupportTicketMessage,
  TSupportTicketMessageCreate,
  TSupportTicketMessageUpdate,
  TAttachment,
} from '@packages/domain'
import { supportTicketMessages } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TMessageRecord = typeof supportTicketMessages.$inferSelect

/**
 * Repository for managing support ticket message entities.
 */
export class SupportTicketMessagesRepository
  extends BaseRepository<
    typeof supportTicketMessages,
    TSupportTicketMessage,
    TSupportTicketMessageCreate,
    TSupportTicketMessageUpdate
  >
  implements IRepository<TSupportTicketMessage, TSupportTicketMessageCreate, TSupportTicketMessageUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, supportTicketMessages)
  }

  protected mapToEntity(record: unknown): TSupportTicketMessage {
    const r = record as TMessageRecord
    return {
      id: r.id,
      ticketId: r.ticketId,
      userId: r.userId,
      message: r.message,
      isInternal: r.isInternal,
      attachments: r.attachments as TAttachment[] | null,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TSupportTicketMessageCreate): Record<string, unknown> {
    return {
      ticketId: dto.ticketId,
      userId: dto.userId,
      message: dto.message,
      isInternal: dto.isInternal,
      attachments: dto.attachments,
    }
  }

  protected mapToUpdateValues(dto: TSupportTicketMessageUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.message !== undefined) values.message = dto.message
    if (dto.isInternal !== undefined) values.isInternal = dto.isInternal
    if (dto.attachments !== undefined) values.attachments = dto.attachments

    // Always update updatedAt
    values.updatedAt = new Date()

    return values
  }

  /**
   * List all messages for a ticket
   */
  async listByTicketId(ticketId: string): Promise<TSupportTicketMessage[]> {
    const results = await this.db
      .select()
      .from(supportTicketMessages)
      .where(eq(supportTicketMessages.ticketId, ticketId))
      .orderBy(desc(supportTicketMessages.createdAt))

    return results.map(r => this.mapToEntity(r))
  }

  /**
   * Get latest message for a ticket
   */
  async getLatestMessage(ticketId: string): Promise<TSupportTicketMessage | null> {
    const results = await this.db
      .select()
      .from(supportTicketMessages)
      .where(eq(supportTicketMessages.ticketId, ticketId))
      .orderBy(desc(supportTicketMessages.createdAt))
      .limit(1)

    return results.length === 0 ? null : this.mapToEntity(results[0])
  }
}
