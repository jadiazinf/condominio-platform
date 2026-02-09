import type { Hono } from 'hono'
import { BuildingsRepository } from '@database/repositories'
import { BuildingsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class BuildingsEndpoint implements IEndpoint {
  readonly path = '/condominium/buildings'
  private readonly controller: BuildingsController

  constructor(db: TDrizzleClient) {
    const repository = new BuildingsRepository(db)
    this.controller = new BuildingsController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
