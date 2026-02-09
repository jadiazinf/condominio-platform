import type { Hono } from 'hono'
import { UnitsRepository } from '@database/repositories'
import { UnitsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class UnitsEndpoint implements IEndpoint {
  readonly path = '/condominium/units'
  private readonly controller: UnitsController

  constructor(db: TDrizzleClient) {
    const repository = new UnitsRepository(db)
    this.controller = new UnitsController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
