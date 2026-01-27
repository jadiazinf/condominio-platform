import type { Hono } from 'hono'
import { SubscriptionInvoicesRepository } from '@database/repositories'
import { SubscriptionInvoicesController } from '../controllers/subscription-invoices/invoices.controller'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class SubscriptionInvoicesEndpoint implements IEndpoint {
  readonly path = ''
  private readonly controller: SubscriptionInvoicesController

  constructor(db: TDrizzleClient) {
    const repository = new SubscriptionInvoicesRepository(db)
    this.controller = new SubscriptionInvoicesController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
