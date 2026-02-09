import type { Hono } from 'hono'
import { EntityPaymentGatewaysRepository } from '@database/repositories'
import { EntityPaymentGatewaysController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class EntityPaymentGatewaysEndpoint implements IEndpoint {
  readonly path = '/condominium/entity-payment-gateways'
  private readonly controller: EntityPaymentGatewaysController

  constructor(db: TDrizzleClient) {
    const repository = new EntityPaymentGatewaysRepository(db)
    this.controller = new EntityPaymentGatewaysController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
