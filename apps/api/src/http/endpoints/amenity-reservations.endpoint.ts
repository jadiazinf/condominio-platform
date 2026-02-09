import type { Hono } from 'hono'
import { AmenityReservationsRepository, AmenitiesRepository } from '@database/repositories'
import { AmenityReservationsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class AmenityReservationsEndpoint implements IEndpoint {
  readonly path = '/condominium/amenity-reservations'
  private readonly controller: AmenityReservationsController

  constructor(db: TDrizzleClient) {
    const reservationsRepository = new AmenityReservationsRepository(db)
    const amenitiesRepository = new AmenitiesRepository(db)
    this.controller = new AmenityReservationsController(
      reservationsRepository,
      amenitiesRepository
    )
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
