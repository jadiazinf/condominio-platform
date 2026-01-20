import type { Hono } from 'hono'
import { SuperadminUsersRepository } from '@database/repositories'
import { SuperadminUsersController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class SuperadminUsersEndpoint implements IEndpoint {
  readonly path = '/superadmin-users'
  private readonly controller: SuperadminUsersController

  constructor(db: TDrizzleClient) {
    const repository = new SuperadminUsersRepository(db)
    this.controller = new SuperadminUsersController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
