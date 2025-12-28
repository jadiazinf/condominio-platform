import type { Hono } from 'hono'
import { PaymentGatewaysRepository } from '@database/repositories'
import { PaymentGatewaysController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class PaymentGatewaysEndpoint implements IEndpoint {
  readonly path = '/payment-gateways'
  private readonly controller: PaymentGatewaysController

  constructor(db: TDrizzleClient) {
    const repository = new PaymentGatewaysRepository(db)
    this.controller = new PaymentGatewaysController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
