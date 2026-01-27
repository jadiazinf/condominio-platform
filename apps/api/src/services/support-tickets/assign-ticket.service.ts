import type { TSupportTicket } from '@packages/domain'
import type { SupportTicketsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IAssignTicketInput {
  ticketId: string
  assignedTo: string
}

/**
 * Service for assigning a ticket to a support agent.
 */
export class AssignTicketService {
  constructor(private readonly ticketsRepository: SupportTicketsRepository) {}

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

    // Assign ticket
    const assigned = await this.ticketsRepository.assignTicket(input.ticketId, input.assignedTo)

    if (!assigned) {
      return failure('Failed to assign ticket', 'INTERNAL_ERROR')
    }

    // Update status to in_progress if it was open
    if (existing.status === 'open') {
      const updated = await this.ticketsRepository.updateStatus(input.ticketId, 'in_progress')
      if (updated) {
        return success(updated)
      }
    }

    return success(assigned)
  }
}
