import type { Hono } from 'hono'
import { SupportTicketsRepository } from '@database/repositories'
import { SupportTicketsController } from '../controllers/support-tickets/support-tickets.controller'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class SupportTicketsEndpoint implements IEndpoint {
  readonly path = ''
  private readonly controller: SupportTicketsController

  constructor(db: TDrizzleClient) {
    const repository = new SupportTicketsRepository(db)
    this.controller = new SupportTicketsController(repository, db)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
