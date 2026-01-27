import type { TSupportTicket } from '@packages/domain'
import type { SupportTicketsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface ICloseTicketInput {
  ticketId: string
  closedBy: string
}

/**
 * Service for closing a ticket.
 */
export class CloseTicketService {
  constructor(private readonly ticketsRepository: SupportTicketsRepository) {}

  async execute(input: ICloseTicketInput): Promise<TServiceResult<TSupportTicket>> {
    // Check if ticket exists
    const existing = await this.ticketsRepository.getById(input.ticketId)

    if (!existing) {
      return failure('Ticket not found', 'NOT_FOUND')
    }

    // Check if ticket is already closed
    if (existing.status === 'closed') {
      return failure('Ticket is already closed', 'BAD_REQUEST')
    }

    if (existing.status === 'cancelled') {
      return failure('Cannot close a cancelled ticket', 'BAD_REQUEST')
    }

    // Close ticket
    const closed = await this.ticketsRepository.closeTicket(input.ticketId, input.closedBy)

    if (!closed) {
      return failure('Failed to close ticket', 'INTERNAL_ERROR')
    }

    return success(closed)
  }
}
