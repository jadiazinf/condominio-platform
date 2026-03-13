import { eq, and, desc } from 'drizzle-orm'
import type { TDrizzleClient } from './interfaces'
import { supportTicketAssignmentHistory, users } from '../drizzle/schema/tables'
import type {
  TSupportTicketAssignmentHistory,
  TSupportTicketAssignmentHistoryCreate,
  TSupportTicketAssignmentHistoryUpdate,
} from '@packages/domain'

export class SupportTicketAssignmentHistoryRepository {
  constructor(private readonly db: TDrizzleClient) {}

  /**
   * Get the current active assignment for a ticket
   */
  async getCurrentAssignment(
    ticketId: string
  ): Promise<TSupportTicketAssignmentHistory | null> {
    const result = await this.db
      .select({
        id: supportTicketAssignmentHistory.id,
        ticketId: supportTicketAssignmentHistory.ticketId,
        assignedTo: supportTicketAssignmentHistory.assignedTo,
        assignedBy: supportTicketAssignmentHistory.assignedBy,
        assignedAt: supportTicketAssignmentHistory.assignedAt,
        unassignedAt: supportTicketAssignmentHistory.unassignedAt,
        isActive: supportTicketAssignmentHistory.isActive,
        createdAt: supportTicketAssignmentHistory.createdAt,
        updatedAt: supportTicketAssignmentHistory.updatedAt,
        assignedToUser: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          photoUrl: users.photoUrl,
        },
      })
      .from(supportTicketAssignmentHistory)
      .leftJoin(users, eq(supportTicketAssignmentHistory.assignedTo, users.id))
      .where(
        and(
          eq(supportTicketAssignmentHistory.ticketId, ticketId),
          eq(supportTicketAssignmentHistory.isActive, true)
        )
      )
      .limit(1)

    return result[0] as TSupportTicketAssignmentHistory | null
  }

  /**
   * Get the full assignment history for a ticket
   */
  async getAssignmentHistory(ticketId: string): Promise<TSupportTicketAssignmentHistory[]> {
    const result = await this.db
      .select({
        id: supportTicketAssignmentHistory.id,
        ticketId: supportTicketAssignmentHistory.ticketId,
        assignedTo: supportTicketAssignmentHistory.assignedTo,
        assignedBy: supportTicketAssignmentHistory.assignedBy,
        assignedAt: supportTicketAssignmentHistory.assignedAt,
        unassignedAt: supportTicketAssignmentHistory.unassignedAt,
        isActive: supportTicketAssignmentHistory.isActive,
        createdAt: supportTicketAssignmentHistory.createdAt,
        updatedAt: supportTicketAssignmentHistory.updatedAt,
        assignedToUser: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          photoUrl: users.photoUrl,
        },
      })
      .from(supportTicketAssignmentHistory)
      .leftJoin(users, eq(supportTicketAssignmentHistory.assignedTo, users.id))
      .where(eq(supportTicketAssignmentHistory.ticketId, ticketId))
      .orderBy(desc(supportTicketAssignmentHistory.assignedAt))

    return result as TSupportTicketAssignmentHistory[]
  }

  /**
   * Deactivate current assignment
   */
  async deactivateCurrentAssignment(ticketId: string): Promise<void> {
    await this.db
      .update(supportTicketAssignmentHistory)
      .set({
        isActive: false,
        unassignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(supportTicketAssignmentHistory.ticketId, ticketId),
          eq(supportTicketAssignmentHistory.isActive, true)
        )
      )
  }

  /**
   * Create a new assignment
   */
  async create(
    data: TSupportTicketAssignmentHistoryCreate
  ): Promise<TSupportTicketAssignmentHistory> {
    const [assignment] = await this.db
      .insert(supportTicketAssignmentHistory)
      .values(data)
      .returning()

    return assignment as TSupportTicketAssignmentHistory
  }

  /**
   * Assign a ticket to a user (handles deactivating old assignment and creating new one)
   */
  async assignTicket(
    ticketId: string,
    assignedTo: string,
    assignedBy: string
  ): Promise<TSupportTicketAssignmentHistory> {
    // Deactivate current assignment if exists
    await this.deactivateCurrentAssignment(ticketId)

    // Create new assignment
    return this.create({
      ticketId,
      assignedTo,
      assignedBy,
      assignedAt: new Date(),
      unassignedAt: null,
      isActive: true,
    })
  }

  /**
   * Update an assignment
   */
  async update(
    id: string,
    data: TSupportTicketAssignmentHistoryUpdate
  ): Promise<TSupportTicketAssignmentHistory | null> {
    const [updated] = await this.db
      .update(supportTicketAssignmentHistory)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(supportTicketAssignmentHistory.id, id))
      .returning()

    return updated as TSupportTicketAssignmentHistory | null
  }
}
