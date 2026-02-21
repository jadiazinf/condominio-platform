import type { Hono } from 'hono'
import { BanksRepository } from '@database/repositories'
import { BanksController } from '../controllers/banks/banks.controller'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class BanksEndpoint implements IEndpoint {
  readonly path = '/banks'
  private readonly controller: BanksController

  constructor(db: TDrizzleClient) {
    const repository = new BanksRepository(db)
    this.controller = new BanksController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
