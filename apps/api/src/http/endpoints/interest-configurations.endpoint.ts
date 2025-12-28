import type { Hono } from 'hono'
import { InterestConfigurationsRepository } from '@database/repositories'
import { InterestConfigurationsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class InterestConfigurationsEndpoint implements IEndpoint {
  readonly path = '/interest-configurations'
  private readonly controller: InterestConfigurationsController

  constructor(db: TDrizzleClient) {
    const repository = new InterestConfigurationsRepository(db)
    this.controller = new InterestConfigurationsController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
