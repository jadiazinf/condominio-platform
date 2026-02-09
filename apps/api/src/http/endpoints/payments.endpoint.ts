import type { Hono } from 'hono'
import { PaymentsRepository } from '@database/repositories'
import { PaymentsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class PaymentsEndpoint implements IEndpoint {
  readonly path = '/condominium/payments'
  private readonly controller: PaymentsController

  constructor(db: TDrizzleClient) {
    const repository = new PaymentsRepository(db)
    this.controller = new PaymentsController(repository, db)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
