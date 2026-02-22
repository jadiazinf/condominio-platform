import type { Hono } from 'hono'
import { ExchangeRatesRepository } from '@database/repositories'
import { MyExchangeRatesController } from '../controllers/my-exchange-rates'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class MyExchangeRatesEndpoint implements IEndpoint {
  readonly path = '/me/exchange-rates'
  private readonly controller: MyExchangeRatesController

  constructor(db: TDrizzleClient) {
    const repository = new ExchangeRatesRepository(db)
    this.controller = new MyExchangeRatesController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
