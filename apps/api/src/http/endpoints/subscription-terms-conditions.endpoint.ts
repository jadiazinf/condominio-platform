import type { Hono } from 'hono'
import { SubscriptionTermsConditionsRepository } from '@database/repositories'
import { SubscriptionTermsConditionsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class SubscriptionTermsConditionsEndpoint implements IEndpoint {
  readonly path = '/platform/subscription-terms'
  private readonly controller: SubscriptionTermsConditionsController

  constructor(db: TDrizzleClient) {
    const repository = new SubscriptionTermsConditionsRepository(db)
    this.controller = new SubscriptionTermsConditionsController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
