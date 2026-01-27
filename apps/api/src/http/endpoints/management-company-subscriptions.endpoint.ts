import type { Hono } from 'hono'
import {
  ManagementCompanySubscriptionsRepository,
  ManagementCompanyMembersRepository,
} from '@database/repositories'
import { ManagementCompanySubscriptionsController } from '../controllers/management-company-subscriptions/subscriptions.controller'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class ManagementCompanySubscriptionsEndpoint implements IEndpoint {
  readonly path = ''
  private readonly controller: ManagementCompanySubscriptionsController

  constructor(db: TDrizzleClient) {
    const repository = new ManagementCompanySubscriptionsRepository(db)
    const membersRepository = new ManagementCompanyMembersRepository(db)
    this.controller = new ManagementCompanySubscriptionsController(repository, membersRepository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
