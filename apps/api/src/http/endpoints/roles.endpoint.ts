import type { Hono } from 'hono'
import { RolesRepository } from '@database/repositories'
import { RolesController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class RolesEndpoint implements IEndpoint {
  readonly path = '/platform/roles'
  private readonly controller: RolesController

  constructor(db: TDrizzleClient) {
    const repository = new RolesRepository(db)
    this.controller = new RolesController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
