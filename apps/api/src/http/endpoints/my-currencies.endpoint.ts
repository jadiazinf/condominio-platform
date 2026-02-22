import type { Hono } from 'hono'
import { CurrenciesRepository } from '@database/repositories'
import { MyCurrenciesController } from '../controllers/my-currencies'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class MyCurrenciesEndpoint implements IEndpoint {
  readonly path = '/me/currencies'
  private readonly controller: MyCurrenciesController

  constructor(db: TDrizzleClient) {
    const repository = new CurrenciesRepository(db)
    this.controller = new MyCurrenciesController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
