import type { Hono } from 'hono'
import { SubscriptionRatesRepository } from '@database/repositories'
import { SubscriptionRatesController } from '../controllers/subscription-rates'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class SubscriptionRatesEndpoint implements IEndpoint {
  readonly path = ''
  private readonly controller: SubscriptionRatesController

  constructor(db: TDrizzleClient) {
    const repository = new SubscriptionRatesRepository(db)
    this.controller = new SubscriptionRatesController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
