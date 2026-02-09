import type { Hono } from 'hono'
import { QuotasRepository } from '@database/repositories'
import { QuotasController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class QuotasEndpoint implements IEndpoint {
  readonly path = '/condominium/quotas'
  private readonly controller: QuotasController

  constructor(db: TDrizzleClient) {
    const repository = new QuotasRepository(db)
    this.controller = new QuotasController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
