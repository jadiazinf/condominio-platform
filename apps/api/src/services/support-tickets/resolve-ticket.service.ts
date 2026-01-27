import type { TSupportTicket } from '@packages/domain'
import type { SupportTicketsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IResolveTicketInput {
  ticketId: string
  resolvedBy: string
}

/**
 * Service for marking a ticket as resolved.
 */
export class ResolveTicketService {
  constructor(private readonly ticketsRepository: SupportTicketsRepository) {}

  async execute(input: IResolveTicketInput): Promise<TServiceResult<TSupportTicket>> {
    // Check if ticket exists
    const existing = await this.ticketsRepository.getById(input.ticketId)

    if (!existing) {
      return failure('Ticket not found', 'NOT_FOUND')
    }

    // Check if ticket is already resolved or closed
    if (existing.status === 'resolved') {
      return failure('Ticket is already resolved', 'BAD_REQUEST')
    }

    if (existing.status === 'closed' || existing.status === 'cancelled') {
      return failure('Cannot resolve a closed or cancelled ticket', 'BAD_REQUEST')
    }

    // Mark as resolved
    const resolved = await this.ticketsRepository.markAsResolved(input.ticketId, input.resolvedBy)

    if (!resolved) {
      return failure('Failed to resolve ticket', 'INTERNAL_ERROR')
    }

    return success(resolved)
  }
}
