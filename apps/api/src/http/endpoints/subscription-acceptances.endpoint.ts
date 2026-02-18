import type { Hono } from 'hono'
import {
  SubscriptionAcceptancesRepository,
  ManagementCompanySubscriptionsRepository,
  SubscriptionAuditHistoryRepository,
  ManagementCompanyMembersRepository,
} from '@database/repositories'
import { SubscriptionAcceptancesController } from '../controllers/subscription-acceptances/acceptances.controller'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class SubscriptionAcceptancesEndpoint implements IEndpoint {
  readonly path = ''
  private readonly controller: SubscriptionAcceptancesController

  constructor(db: TDrizzleClient) {
    const acceptancesRepository = new SubscriptionAcceptancesRepository(db)
    const subscriptionsRepository = new ManagementCompanySubscriptionsRepository(db)
    const auditRepository = new SubscriptionAuditHistoryRepository(db)
    const membersRepository = new ManagementCompanyMembersRepository(db)
    this.controller = new SubscriptionAcceptancesController(
      acceptancesRepository,
      subscriptionsRepository,
      auditRepository,
      membersRepository
    )
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
