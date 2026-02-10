import type { Hono } from 'hono'
import { CondominiumsRepository } from '@database/repositories'
import { PlatformCondominiumsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class PlatformCondominiumsEndpoint implements IEndpoint {
  readonly path = '/platform/condominiums'
  private readonly controller: PlatformCondominiumsController

  constructor(db: TDrizzleClient) {
    const repository = new CondominiumsRepository(db)
    this.controller = new PlatformCondominiumsController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
