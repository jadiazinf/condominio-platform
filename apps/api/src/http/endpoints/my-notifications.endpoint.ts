import type { Hono } from 'hono'
import { NotificationsRepository } from '@database/repositories'
import { MyNotificationsController } from '../controllers/my-notifications'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class MyNotificationsEndpoint implements IEndpoint {
  readonly path = '/me/notifications'
  private readonly controller: MyNotificationsController

  constructor(db: TDrizzleClient) {
    const repository = new NotificationsRepository(db)
    this.controller = new MyNotificationsController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
