import type { Hono } from 'hono'
import { ExchangeRatesRepository } from '@database/repositories'
import { ExchangeRatesController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class ExchangeRatesEndpoint implements IEndpoint {
  readonly path = '/exchange-rates'
  private readonly controller: ExchangeRatesController

  constructor(db: TDrizzleClient) {
    const repository = new ExchangeRatesRepository(db)
    this.controller = new ExchangeRatesController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
