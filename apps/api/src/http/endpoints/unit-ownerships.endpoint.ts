import type { Hono } from 'hono'
import { UnitOwnershipsRepository } from '@database/repositories'
import { UnitOwnershipsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class UnitOwnershipsEndpoint implements IEndpoint {
  readonly path = '/unit-ownerships'
  private readonly controller: UnitOwnershipsController

  constructor(db: TDrizzleClient) {
    const repository = new UnitOwnershipsRepository(db)
    this.controller = new UnitOwnershipsController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
