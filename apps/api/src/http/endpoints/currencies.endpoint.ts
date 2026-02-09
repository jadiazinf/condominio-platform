import type { Hono } from 'hono'
import { CurrenciesRepository } from '@database/repositories'
import { CurrenciesController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class CurrenciesEndpoint implements IEndpoint {
  readonly path = '/platform/currencies'
  private readonly controller: CurrenciesController

  constructor(db: TDrizzleClient) {
    const repository = new CurrenciesRepository(db)
    this.controller = new CurrenciesController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
