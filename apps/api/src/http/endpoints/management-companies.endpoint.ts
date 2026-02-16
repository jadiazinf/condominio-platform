import type { Hono } from 'hono'
import {
  ManagementCompaniesRepository,
  ManagementCompanySubscriptionsRepository,
  ManagementCompanyMembersRepository,
  LocationsRepository,
  UsersRepository,
  PaymentConceptsRepository,
} from '@database/repositories'
import { ManagementCompaniesController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class ManagementCompaniesEndpoint implements IEndpoint {
  readonly path = '/platform/management-companies'
  private readonly controller: ManagementCompaniesController

  constructor(db: TDrizzleClient) {
    const repository = new ManagementCompaniesRepository(db)
    const subscriptionsRepository = new ManagementCompanySubscriptionsRepository(db)
    const locationsRepository = new LocationsRepository(db)
    const usersRepository = new UsersRepository(db)
    const membersRepository = new ManagementCompanyMembersRepository(db)
    const paymentConceptsRepository = new PaymentConceptsRepository(db)
    this.controller = new ManagementCompaniesController(
      repository,
      subscriptionsRepository,
      locationsRepository,
      usersRepository,
      membersRepository,
      paymentConceptsRepository
    )
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
