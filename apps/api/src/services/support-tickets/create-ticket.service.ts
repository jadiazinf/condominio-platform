import type { TSupportTicket, TSupportTicketCreate } from '@packages/domain'
import type { SupportTicketsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface ICreateTicketInput extends Omit<TSupportTicketCreate, 'ticketNumber'> {}

/**
 * Service for creating a new support ticket.
 * Generates ticket number automatically.
 */
export class CreateTicketService {
  constructor(private readonly ticketsRepository: SupportTicketsRepository) {}

  async execute(input: ICreateTicketInput): Promise<TServiceResult<TSupportTicket>> {
    // Generate ticket number
    const ticketNumber = await this.generateTicketNumber()

    // Create ticket
    const ticket = await this.ticketsRepository.create({
      ...input,
      ticketNumber,
    } as TSupportTicketCreate & { ticketNumber: string })

    return success(ticket)
  }

  private async generateTicketNumber(): Promise<string> {
    // Generate ticket number in format: TICKET-YYYY-XXXXX
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0')
    return `TICKET-${year}-${random}`
  }
}
