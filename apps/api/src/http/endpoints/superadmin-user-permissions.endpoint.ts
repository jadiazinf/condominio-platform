import type { Hono } from 'hono'
import { SuperadminUserPermissionsRepository } from '@database/repositories'
import { SuperadminUserPermissionsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class SuperadminUserPermissionsEndpoint implements IEndpoint {
  readonly path = '/superadmin-user-permissions'
  private readonly controller: SuperadminUserPermissionsController

  constructor(db: TDrizzleClient) {
    const repository = new SuperadminUserPermissionsRepository(db)
    this.controller = new SuperadminUserPermissionsController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
