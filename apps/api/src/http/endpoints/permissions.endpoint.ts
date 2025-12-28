import type { Hono } from 'hono'
import { PermissionsRepository } from '@database/repositories'
import { PermissionsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class PermissionsEndpoint implements IEndpoint {
  readonly path = '/permissions'
  private readonly controller: PermissionsController

  constructor(db: TDrizzleClient) {
    const repository = new PermissionsRepository(db)
    this.controller = new PermissionsController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
