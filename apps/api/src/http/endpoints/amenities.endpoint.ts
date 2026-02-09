import type { Hono } from 'hono'
import { AmenitiesRepository } from '@database/repositories'
import { AmenitiesController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class AmenitiesEndpoint implements IEndpoint {
  readonly path = '/condominium/amenities'
  private readonly controller: AmenitiesController

  constructor(db: TDrizzleClient) {
    const repository = new AmenitiesRepository(db)
    this.controller = new AmenitiesController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
