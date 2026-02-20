import type { Hono } from 'hono'
import { MyAccessRequestsController } from '../controllers/my-access-requests'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class MyAccessRequestsEndpoint implements IEndpoint {
  readonly path = '/me/access-requests'
  private readonly controller: MyAccessRequestsController

  constructor(db: TDrizzleClient) {
    this.controller = new MyAccessRequestsController(db)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
