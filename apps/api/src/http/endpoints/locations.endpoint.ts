import type { Hono } from 'hono'
import { LocationsRepository } from '@database/repositories'
import { LocationsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class LocationsEndpoint implements IEndpoint {
  readonly path = '/locations'
  private readonly controller: LocationsController

  constructor(db: TDrizzleClient) {
    const repository = new LocationsRepository(db)
    this.controller = new LocationsController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
