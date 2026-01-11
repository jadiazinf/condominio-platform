import type { Hono } from 'hono'
import {
  NotificationsRepository,
  NotificationDeliveriesRepository,
  UserNotificationPreferencesRepository,
} from '@database/repositories'
import { NotificationsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class NotificationsEndpoint implements IEndpoint {
  readonly path = '/notifications'
  private readonly controller: NotificationsController

  constructor(db: TDrizzleClient) {
    const repository = new NotificationsRepository(db)
    const deliveriesRepository = new NotificationDeliveriesRepository(db)
    const preferencesRepository = new UserNotificationPreferencesRepository(db)
    this.controller = new NotificationsController(
      repository,
      deliveriesRepository,
      preferencesRepository
    )
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
