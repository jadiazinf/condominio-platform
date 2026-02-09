import type { Hono } from 'hono'
import {
  CondominiumsRepository,
  ManagementCompanySubscriptionsRepository,
  ManagementCompaniesRepository,
  LocationsRepository,
  CurrenciesRepository,
  UsersRepository,
} from '@database/repositories'
import { CondominiumsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class CondominiumsEndpoint implements IEndpoint {
  readonly path = '/condominium/condominiums'
  private readonly controller: CondominiumsController

  constructor(db: TDrizzleClient) {
    const condominiumsRepository = new CondominiumsRepository(db)
    const subscriptionsRepository = new ManagementCompanySubscriptionsRepository(db)
    const companiesRepository = new ManagementCompaniesRepository(db)
    const locationsRepository = new LocationsRepository(db)
    const currenciesRepository = new CurrenciesRepository(db)
    const usersRepository = new UsersRepository(db)
    this.controller = new CondominiumsController(
      condominiumsRepository,
      subscriptionsRepository,
      companiesRepository,
      locationsRepository,
      currenciesRepository,
      usersRepository,
      db
    )
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
