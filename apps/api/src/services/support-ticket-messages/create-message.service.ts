import type { TSupportTicketMessage, TSupportTicketMessageCreate } from '@packages/domain'
import type { SupportTicketMessagesRepository, SupportTicketsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'
import { WebSocketManager } from '@libs/websocket'

export interface ICreateMessageInput extends TSupportTicketMessageCreate {}

/**
 * Service for creating a new ticket message.
 */
export class CreateMessageService {
  private readonly wsManager = WebSocketManager.getInstance()

  constructor(
    private readonly messagesRepository: SupportTicketMessagesRepository,
    private readonly ticketsRepository: SupportTicketsRepository
  ) {}

  async execute(input: ICreateMessageInput): Promise<TServiceResult<TSupportTicketMessage>> {
    // Check if ticket exists
    const ticket = await this.ticketsRepository.getById(input.ticketId)

    if (!ticket) {
      return failure('Ticket not found', 'NOT_FOUND')
    }

    // Check if ticket is closed or cancelled
    if (ticket.status === 'closed' || ticket.status === 'cancelled') {
      return failure('Cannot add message to a closed or cancelled ticket', 'BAD_REQUEST')
    }

    // Create message
    const createdMessage = await this.messagesRepository.create(input)

    // Update ticket's updatedAt timestamp
    await this.ticketsRepository.update(input.ticketId, {})

    // Fetch the message again with user information for broadcasting
    const messages = await this.messagesRepository.listByTicketId(input.ticketId)
    const messageWithUser = messages.find(m => m.id === createdMessage.id)

    if (!messageWithUser) {
      return failure('Failed to retrieve created message', 'INTERNAL_ERROR')
    }

    // Broadcast new message with user info to all connected clients
    this.wsManager.broadcastToTicket(input.ticketId, 'new_message', messageWithUser)

    return success(messageWithUser)
  }
}
