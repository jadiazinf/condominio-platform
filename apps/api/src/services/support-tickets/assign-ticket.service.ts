import type { TSupportTicket } from '@packages/domain'
import type { SupportTicketsRepository } from '@database/repositories'
import { SupportTicketAssignmentHistoryRepository } from '@database/repositories/support-ticket-assignment-history.repository'
import { type TServiceResult, success, failure } from '../base.service'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export interface IAssignTicketInput {
  ticketId: string
  assignedTo: string
  assignedBy: string
}

/**
 * Service for assigning a ticket to a support agent.
 * Creates a new entry in the assignment history and marks the previous assignment as inactive.
 */
export class AssignTicketService {
  private readonly assignmentHistoryRepository: SupportTicketAssignmentHistoryRepository

  constructor(
    private readonly ticketsRepository: SupportTicketsRepository,
    private readonly db: TDrizzleClient
  ) {
    this.assignmentHistoryRepository = new SupportTicketAssignmentHistoryRepository(db)
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

    return success(updated)
  }
}
