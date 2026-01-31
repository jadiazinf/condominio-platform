import type { TSupportTicket } from '@packages/domain'
import type { SupportTicketsRepository } from '@database/repositories'
import { SupportTicketAssignmentHistoryRepository } from '@database/repositories/support-ticket-assignment-history.repository'
import { UsersRepository } from '@database/repositories/users.repository'
import { type TServiceResult, success, failure } from '../base.service'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { SendTicketAssignmentEmailService } from '../email/send-ticket-assignment-email.service'
import logger from '@utils/logger'

export interface IAssignTicketInput {
  ticketId: string
  assignedTo: string
  assignedBy: string
}

/**
 * Service for assigning a ticket to a support agent.
 * Creates a new entry in the assignment history and marks the previous assignment as inactive.
 * Sends an email notification to the assigned user.
 */
export class AssignTicketService {
  private readonly assignmentHistoryRepository: SupportTicketAssignmentHistoryRepository
  private readonly usersRepository: UsersRepository
  private readonly emailService: SendTicketAssignmentEmailService

  constructor(
    private readonly ticketsRepository: SupportTicketsRepository,
    private readonly db: TDrizzleClient
  ) {
    this.assignmentHistoryRepository = new SupportTicketAssignmentHistoryRepository(db)
    this.usersRepository = new UsersRepository(db)
    this.emailService = new SendTicketAssignmentEmailService()
  }

  async execute(input: IAssignTicketInput): Promise<TServiceResult<TSupportTicket>> {
    // Check if ticket exists
    const existing = await this.ticketsRepository.getById(input.ticketId)

    if (!existing) {
      return failure('Ticket not found', 'NOT_FOUND')
    }

    // Check if ticket is already closed or cancelled
    if (existing.status === 'closed' || existing.status === 'cancelled') {
      return failure('Cannot assign a closed or cancelled ticket', 'BAD_REQUEST')
    }

    // Create assignment in history (this automatically deactivates previous assignment)
    await this.assignmentHistoryRepository.assignTicket(
      input.ticketId,
      input.assignedTo,
      input.assignedBy
    )

    // Update status to in_progress if it was open
    if (existing.status === 'open') {
      await this.ticketsRepository.updateStatus(input.ticketId, 'in_progress')
    }

    // Return updated ticket with current assignment
    const updated = await this.ticketsRepository.findByIdWithDetails(input.ticketId)

    if (!updated) {
      return failure('Failed to retrieve updated ticket', 'INTERNAL_ERROR')
    }

    // Send email notification to the assigned user (non-blocking)
    this.sendAssignmentEmail(updated, input.assignedTo, input.assignedBy).catch((error) => {
      logger.error({ error, ticketId: input.ticketId }, 'Failed to send ticket assignment email')
    })

    return success(updated)
  }

  /**
   * Sends an email notification to the assigned user.
   * This is a fire-and-forget operation that doesn't block the assignment process.
   */
  private async sendAssignmentEmail(
    ticket: TSupportTicket,
    assignedToId: string,
    assignedById: string
  ): Promise<void> {
    // Fetch both users in parallel
    const [assignedToUser, assignedByUser] = await Promise.all([
      this.usersRepository.getById(assignedToId),
      this.usersRepository.getById(assignedById),
    ])

    if (!assignedToUser?.email) {
      logger.warn({ ticketId: ticket.id, assignedToId }, 'Cannot send assignment email: assigned user not found or has no email')
      return
    }

    const recipientName = assignedToUser.firstName && assignedToUser.lastName
      ? `${assignedToUser.firstName} ${assignedToUser.lastName}`
      : assignedToUser.displayName || assignedToUser.email

    const assignedToName = assignedToUser.firstName && assignedToUser.lastName
      ? `${assignedToUser.firstName} ${assignedToUser.lastName}`
      : assignedToUser.displayName || assignedToUser.email

    const assignedByName = assignedByUser
      ? assignedByUser.firstName && assignedByUser.lastName
        ? `${assignedByUser.firstName} ${assignedByUser.lastName}`
        : assignedByUser.displayName || assignedByUser.email
      : 'Sistema'

    const result = await this.emailService.execute({
      to: assignedToUser.email,
      recipientName,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      ticketSubject: ticket.subject,
      ticketDescription: ticket.description,
      ticketPriority: ticket.priority,
      ticketStatus: ticket.status,
      ticketCategory: ticket.category ?? undefined,
      ticketCreatedAt: ticket.createdAt,
      assignedByName,
      assignedToName,
    })

    if (!result.success) {
      logger.error(
        { error: result.error, ticketId: ticket.id },
        'Failed to send ticket assignment email'
      )
    } else {
      logger.info(
        { ticketId: ticket.id, emailId: result.data.emailId, to: assignedToUser.email },
        'Ticket assignment email sent successfully'
      )
    }
  }
}
