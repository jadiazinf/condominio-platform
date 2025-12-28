import type { Hono } from 'hono'
import { UserRolesRepository } from '@database/repositories'
import { UserRolesController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class UserRolesEndpoint implements IEndpoint {
  readonly path = '/user-roles'
  private readonly controller: UserRolesController

  constructor(db: TDrizzleClient) {
    const repository = new UserRolesRepository(db)
    this.controller = new UserRolesController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
