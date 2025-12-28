import type { Hono } from 'hono'
import { CondominiumsRepository } from '@database/repositories'
import { CondominiumsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class CondominiumsEndpoint implements IEndpoint {
  readonly path = '/condominiums'
  private readonly controller: CondominiumsController

  constructor(db: TDrizzleClient) {
    const repository = new CondominiumsRepository(db)
    this.controller = new CondominiumsController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
