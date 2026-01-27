import type { Hono } from 'hono'
import {
  SupportTicketMessagesRepository,
  SupportTicketsRepository,
} from '@database/repositories'
import { SupportTicketMessagesController } from '../controllers/support-ticket-messages/messages.controller'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class SupportTicketMessagesEndpoint implements IEndpoint {
  readonly path = ''
  private readonly controller: SupportTicketMessagesController

  constructor(db: TDrizzleClient) {
    const repository = new SupportTicketMessagesRepository(db)
    const ticketsRepository = new SupportTicketsRepository(db)
    this.controller = new SupportTicketMessagesController(repository, ticketsRepository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
