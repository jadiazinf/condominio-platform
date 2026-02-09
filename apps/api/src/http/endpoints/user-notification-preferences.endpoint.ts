import type { Hono } from 'hono'
import { UserNotificationPreferencesRepository } from '@database/repositories'
import { UserNotificationPreferencesController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class UserNotificationPreferencesEndpoint implements IEndpoint {
  readonly path = '/me/notification-preferences'
  private readonly controller: UserNotificationPreferencesController

  constructor(db: TDrizzleClient) {
    const repository = new UserNotificationPreferencesRepository(db)
    this.controller = new UserNotificationPreferencesController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
