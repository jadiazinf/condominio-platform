import type { Hono } from 'hono'
import { MessagesRepository } from '@database/repositories'
import { MessagesController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class MessagesEndpoint implements IEndpoint {
  readonly path = '/messages'
  private readonly controller: MessagesController

  constructor(db: TDrizzleClient) {
    const repository = new MessagesRepository(db)
    this.controller = new MessagesController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
