import type { TSupportTicket, TTicketStatus } from '@packages/domain'
import type { SupportTicketsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IUpdateTicketStatusInput {
  ticketId: string
  status: TTicketStatus
}

export interface IStatusTransitionError {
  type: 'INVALID_TRANSITION'
  from: TTicketStatus
  to: TTicketStatus
}

// Union type for errors that can be either string or structured
export type TUpdateStatusError = string | IStatusTransitionError

/**
 * Service for updating ticket status.
 */
export class UpdateTicketStatusService {
  constructor(private readonly ticketsRepository: SupportTicketsRepository) {}

  async execute(input: IUpdateTicketStatusInput): Promise<TServiceResult<TSupportTicket, TUpdateStatusError>> {
    // Check if ticket exists
    const existing = await this.ticketsRepository.getById(input.ticketId)

    if (!existing) {
      return failure<TSupportTicket, TUpdateStatusError>('Ticket not found', 'NOT_FOUND')
    }

    // Validate status transition
    if (!this.isValidStatusTransition(existing.status, input.status)) {
      return failure<TSupportTicket, TUpdateStatusError>(
        { type: 'INVALID_TRANSITION', from: existing.status, to: input.status },
        'BAD_REQUEST'
      )
    }

    // Update status
    const updated = await this.ticketsRepository.updateStatus(input.ticketId, input.status)

    if (!updated) {
      return failure<TSupportTicket, TUpdateStatusError>('Failed to update ticket status', 'INTERNAL_ERROR')
    }

    return success(updated)
  }

  private isValidStatusTransition(from: TTicketStatus, to: TTicketStatus): boolean {
    // Define valid transitions
    const validTransitions: Record<TTicketStatus, TTicketStatus[]> = {
      open: ['in_progress', 'waiting_customer', 'cancelled'],
      in_progress: ['waiting_customer', 'resolved', 'cancelled'],
      waiting_customer: ['in_progress', 'resolved', 'cancelled'],
      resolved: ['closed', 'in_progress'], // Can reopen if needed
      closed: [], // Cannot transition from closed
      cancelled: [], // Cannot transition from cancelled
    }

    return validTransitions[from]?.includes(to) ?? false
  }
}
