import type { Hono } from 'hono'
import { UserFcmTokensRepository } from '@database/repositories'
import { UserFcmTokensController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class UserFcmTokensEndpoint implements IEndpoint {
  readonly path = '/user-fcm-tokens'
  private readonly controller: UserFcmTokensController

  constructor(db: TDrizzleClient) {
    const repository = new UserFcmTokensRepository(db)
    this.controller = new UserFcmTokensController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
