import type { Hono } from 'hono'
import { RolePermissionsRepository } from '@database/repositories'
import { RolePermissionsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class RolePermissionsEndpoint implements IEndpoint {
  readonly path = '/platform/role-permissions'
  private readonly controller: RolePermissionsController

  constructor(db: TDrizzleClient) {
    const repository = new RolePermissionsRepository(db)
    this.controller = new RolePermissionsController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
