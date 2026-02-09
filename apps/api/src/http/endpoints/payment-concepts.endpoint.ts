import type { Hono } from 'hono'
import { PaymentConceptsRepository } from '@database/repositories'
import { PaymentConceptsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class PaymentConceptsEndpoint implements IEndpoint {
  readonly path = '/condominium/payment-concepts'
  private readonly controller: PaymentConceptsController

  constructor(db: TDrizzleClient) {
    const repository = new PaymentConceptsRepository(db)
    this.controller = new PaymentConceptsController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
