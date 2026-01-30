import { eq, and, or, asc, count, inArray, ilike } from 'drizzle-orm'
import type {
  TSupportTicket,
  TSupportTicketCreate,
  TSupportTicketUpdate,
  TSupportTicketMessage,
  TTicketStatus,
  TTicketPriority,
  TPaginatedResponse,
  TUser,
} from '@packages/domain'
import { supportTickets, supportTicketMessages, users } from '@database/drizzle/schema'
import type { TDrizzleClient, IRepository } from './interfaces'
import { BaseRepository } from './base'

type TTicketRecord = typeof supportTickets.$inferSelect

export interface ITicketFilters {
  status?: TTicketStatus
  priority?: TTicketPriority
  assignedTo?: string
  search?: string
  page?: number
  limit?: number
}

/**
 * Repository for managing support ticket entities.
 */
export class SupportTicketsRepository
  extends BaseRepository<
    typeof supportTickets,
    TSupportTicket,
    TSupportTicketCreate,
    TSupportTicketUpdate
  >
  implements IRepository<TSupportTicket, TSupportTicketCreate, TSupportTicketUpdate>
{
  constructor(db: TDrizzleClient) {
    super(db, supportTickets)
  }

  protected mapToEntity(record: unknown): TSupportTicket {
    const r = record as TTicketRecord
    return {
      id: r.id,
      ticketNumber: r.ticketNumber,
      managementCompanyId: r.managementCompanyId,
      createdByUserId: r.createdByUserId,
      createdByMemberId: r.createdByMemberId,
      subject: r.subject,
      description: r.description,
      priority: r.priority,
      status: r.status,
      category: r.category,
      assignedTo: r.assignedTo,
      assignedAt: r.assignedAt,
      resolvedAt: r.resolvedAt,
      resolvedBy: r.resolvedBy,
      closedAt: r.closedAt,
      closedBy: r.closedBy,
      metadata: r.metadata as Record<string, unknown> | null,
      tags: r.tags ?? null,
      isActive: r.isActive ?? true,
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }
  }

  protected mapToInsertValues(dto: TSupportTicketCreate): Record<string, unknown> {
    return {
      ticketNumber: dto.ticketNumber,
      managementCompanyId: dto.managementCompanyId,
      createdByUserId: dto.createdByUserId,
      createdByMemberId: dto.createdByMemberId,
      subject: dto.subject,
      description: dto.description,
      priority: dto.priority,
      status: dto.status,
      category: dto.category,
      assignedTo: dto.assignedTo,
      assignedAt: dto.assignedAt,
      resolvedAt: dto.resolvedAt,
      resolvedBy: dto.resolvedBy,
      closedAt: dto.closedAt,
      closedBy: dto.closedBy,
      metadata: dto.metadata,
      tags: dto.tags,
    }
  }

  protected mapToUpdateValues(dto: TSupportTicketUpdate): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    if (dto.subject !== undefined) values.subject = dto.subject
    if (dto.description !== undefined) values.description = dto.description
    if (dto.priority !== undefined) values.priority = dto.priority
    if (dto.status !== undefined) values.status = dto.status
    if (dto.category !== undefined) values.category = dto.category
    if (dto.assignedTo !== undefined) values.assignedTo = dto.assignedTo
    if (dto.assignedAt !== undefined) values.assignedAt = dto.assignedAt
    if (dto.resolvedAt !== undefined) values.resolvedAt = dto.resolvedAt
    if (dto.resolvedBy !== undefined) values.resolvedBy = dto.resolvedBy
    if (dto.closedAt !== undefined) values.closedAt = dto.closedAt
    if (dto.closedBy !== undefined) values.closedBy = dto.closedBy
    if (dto.metadata !== undefined) values.metadata = dto.metadata
    if (dto.tags !== undefined) values.tags = dto.tags

    // Always update updatedAt
    values.updatedAt = new Date()

    return values
  }

  /**
   * List all tickets for a management company with optional filters
   */
  async listByCompanyId(
    companyId: string,
    filters?: ITicketFilters
  ): Promise<TPaginatedResponse<TSupportTicket>> {
    const page = filters?.page ?? 1
    const limit = filters?.limit ?? 20

    const conditions = [eq(supportTickets.managementCompanyId, companyId)]

    if (filters?.status) {
      conditions.push(eq(supportTickets.status, filters.status))
    }

    if (filters?.priority) {
      conditions.push(eq(supportTickets.priority, filters.priority))
    }

    if (filters?.assignedTo) {
      conditions.push(eq(supportTickets.assignedTo, filters.assignedTo))
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`
      conditions.push(
        or(
          ilike(supportTickets.ticketNumber, searchTerm),
          ilike(supportTickets.subject, searchTerm)
        )!
      )
    }

    // Get total count
    const countResult = await this.db
      .select({ total: count() })
      .from(supportTickets)
      .where(and(...conditions))

    const total = countResult[0]?.total ?? 0

    // Get paginated results
    const results = await this.db
      .select()
      .from(supportTickets)
      .where(and(...conditions))
      .orderBy(asc(supportTickets.createdAt))
      .limit(limit)
      .offset((page - 1) * limit)

    const totalPages = Math.ceil(total / limit)

    return {
      data: results.map(r => this.mapToEntity(r)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
  }

  /**
   * Find all tickets across all management companies with optional filters
   * Used by superadmins to view all tickets
   */
  async findAll(filters?: ITicketFilters): Promise<TPaginatedResponse<TSupportTicket>> {
    const page = filters?.page ?? 1
    const limit = filters?.limit ?? 20

    const conditions = []

    if (filters?.status) {
      conditions.push(eq(supportTickets.status, filters.status))
    }

    if (filters?.priority) {
      conditions.push(eq(supportTickets.priority, filters.priority))
    }

    if (filters?.assignedTo) {
      conditions.push(eq(supportTickets.assignedTo, filters.assignedTo))
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`
      conditions.push(
        or(
          ilike(supportTickets.ticketNumber, searchTerm),
          ilike(supportTickets.subject, searchTerm)
        )!
      )
    }

    // Get total count
    const countQuery = this.db.select({ total: count() }).from(supportTickets)

    const countResult =
      conditions.length > 0 ? await countQuery.where(and(...conditions)) : await countQuery

    const total = countResult[0]?.total ?? 0

    // Get paginated results
    const dataQuery = this.db.select().from(supportTickets)

    const results =
      conditions.length > 0
        ? await dataQuery
            .where(and(...conditions))
            .orderBy(asc(supportTickets.createdAt))
            .limit(limit)
            .offset((page - 1) * limit)
        : await dataQuery
            .orderBy(asc(supportTickets.createdAt))
            .limit(limit)
            .offset((page - 1) * limit)

    const totalPages = Math.ceil(total / limit)

    return {
      data: results.map(r => this.mapToEntity(r)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
  }

  /**
   * Get ticket by ticket number
   */
  async getByTicketNumber(ticketNumber: string): Promise<TSupportTicket | null> {
    const results = await this.db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.ticketNumber, ticketNumber))
      .limit(1)

    return results.length === 0 ? null : this.mapToEntity(results[0])
  }

  /**
   * Assign ticket to a user
   */
  async assignTicket(ticketId: string, userId: string): Promise<TSupportTicket | null> {
    return this.update(ticketId, {
      assignedTo: userId,
      assignedAt: new Date(),
    })
  }

  /**
   * Update ticket status
   */
  async updateStatus(ticketId: string, status: TTicketStatus): Promise<TSupportTicket | null> {
    return this.update(ticketId, { status })
  }

  /**
   * Get count of open tickets for a company
   */
  async getOpenTicketsCount(companyId: string): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.managementCompanyId, companyId),
          inArray(supportTickets.status, ['open', 'in_progress', 'waiting_customer'])
        )
      )

    return result[0]?.count ?? 0
  }

  /**
   * Mark ticket as resolved
   */
  async markAsResolved(ticketId: string, userId: string): Promise<TSupportTicket | null> {
    return this.update(ticketId, {
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedBy: userId,
    })
  }

  /**
   * Close ticket
   */
  async closeTicket(ticketId: string, userId: string): Promise<TSupportTicket | null> {
    return this.update(ticketId, {
      status: 'closed',
      closedAt: new Date(),
      closedBy: userId,
    })
  }

  /**
   * Helper to map a user record to TUser
   */
  private mapUserToEntity(user: typeof users.$inferSelect | null): TUser | undefined {
    if (!user) return undefined
    return {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      displayName: user.displayName,
      phoneCountryCode: user.phoneCountryCode,
      phoneNumber: user.phoneNumber,
      photoUrl: user.photoUrl,
      firstName: user.firstName,
      lastName: user.lastName,
      idDocumentType: user.idDocumentType,
      idDocumentNumber: user.idDocumentNumber,
      address: user.address,
      locationId: user.locationId,
      preferredLanguage: user.preferredLanguage,
      preferredCurrencyId: user.preferredCurrencyId,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      lastLogin: user.lastLogin,
      metadata: user.metadata as Record<string, unknown> | null,
      createdAt: user.createdAt ?? new Date(),
      updatedAt: user.updatedAt ?? new Date(),
    } as TUser
  }

  /**
   * Helper to fetch a user by ID
   */
  private async getUserById(userId: string | null): Promise<typeof users.$inferSelect | null> {
    if (!userId) return null
    const result = await this.db.select().from(users).where(eq(users.id, userId)).limit(1)
    return result[0] || null
  }

  /**
   * Get ticket by ID with user details and messages
   */
  async findByIdWithDetails(ticketId: string): Promise<TSupportTicket | null> {
    // Get the ticket
    const ticketResult = await this.db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .limit(1)

    const ticket = ticketResult[0]
    if (!ticket) {
      return null
    }

    // Fetch all related users in parallel
    const [createdByUser, assignedToUser, resolvedByUser, closedByUser] = await Promise.all([
      this.getUserById(ticket.createdByUserId),
      this.getUserById(ticket.assignedTo),
      this.getUserById(ticket.resolvedBy),
      this.getUserById(ticket.closedBy),
    ])

    // Get ticket messages with user details
    const messagesResult = await this.db
      .select({
        message: supportTicketMessages,
        user: users,
      })
      .from(supportTicketMessages)
      .innerJoin(users, eq(supportTicketMessages.userId, users.id))
      .where(eq(supportTicketMessages.ticketId, ticketId))
      .orderBy(asc(supportTicketMessages.createdAt))

    // Map messages with user info
    const messages: TSupportTicketMessage[] = messagesResult.map(({ message, user }) => ({
      id: message.id,
      ticketId: message.ticketId,
      userId: message.userId,
      message: message.message,
      isInternal: message.isInternal,
      attachments: message.attachments as any,
      isActive: message.isActive ?? true,
      createdAt: message.createdAt ?? new Date(),
      updatedAt: message.updatedAt ?? new Date(),
      user: this.mapUserToEntity(user),
    }))

    // Map ticket with users and messages
    return {
      ...this.mapToEntity(ticket),
      createdByUser: this.mapUserToEntity(createdByUser),
      assignedToUser: this.mapUserToEntity(assignedToUser),
      resolvedByUser: this.mapUserToEntity(resolvedByUser),
      closedByUser: this.mapUserToEntity(closedByUser),
      messages,
    }
  }
}
