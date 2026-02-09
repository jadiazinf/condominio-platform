import type { Hono } from 'hono'
import { PaymentApplicationsRepository } from '@database/repositories'
import { PaymentApplicationsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class PaymentApplicationsEndpoint implements IEndpoint {
  readonly path = '/condominium/payment-applications'
  private readonly controller: PaymentApplicationsController

  constructor(db: TDrizzleClient) {
    const repository = new PaymentApplicationsRepository(db)
    this.controller = new PaymentApplicationsController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
