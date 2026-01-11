import type { Hono } from 'hono'
import { NotificationTemplatesRepository } from '@database/repositories'
import { NotificationTemplatesController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class NotificationTemplatesEndpoint implements IEndpoint {
  readonly path = '/notification-templates'
  private readonly controller: NotificationTemplatesController

  constructor(db: TDrizzleClient) {
    const repository = new NotificationTemplatesRepository(db)
    this.controller = new NotificationTemplatesController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
