import type { Hono } from 'hono'
import { AccessRequestsRepository } from '@database/repositories'
import { AccessRequestsController } from '../controllers/access-requests'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class AccessRequestsEndpoint implements IEndpoint {
  readonly path = '/condominium/access-requests'
  private readonly controller: AccessRequestsController

  constructor(db: TDrizzleClient) {
    const repository = new AccessRequestsRepository(db)
    this.controller = new AccessRequestsController(repository, db)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
