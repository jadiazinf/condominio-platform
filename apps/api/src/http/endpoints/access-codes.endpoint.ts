import type { Hono } from 'hono'
import { CondominiumAccessCodesRepository } from '@database/repositories'
import { AccessCodesController } from '../controllers/access-codes'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class AccessCodesEndpoint implements IEndpoint {
  readonly path = '/condominium/access-codes'
  private readonly controller: AccessCodesController

  constructor(db: TDrizzleClient) {
    const repository = new CondominiumAccessCodesRepository(db)
    this.controller = new AccessCodesController(repository, db)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
