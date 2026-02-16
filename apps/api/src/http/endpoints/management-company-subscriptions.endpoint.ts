import type { Hono } from 'hono'
import {
  ManagementCompanySubscriptionsRepository,
  ManagementCompanyMembersRepository,
  ManagementCompaniesRepository,
  UsersRepository,
  SubscriptionAcceptancesRepository,
  SubscriptionTermsConditionsRepository,
  SubscriptionAuditHistoryRepository,
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
    const companiesRepository = new ManagementCompaniesRepository(db)
    const usersRepository = new UsersRepository(db)
    const acceptancesRepository = new SubscriptionAcceptancesRepository(db)
    const termsRepository = new SubscriptionTermsConditionsRepository(db)
    const auditRepository = new SubscriptionAuditHistoryRepository(db)
    this.controller = new ManagementCompanySubscriptionsController(
      repository,
      membersRepository,
      companiesRepository,
      usersRepository,
      acceptancesRepository,
      termsRepository,
      auditRepository
    )
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
