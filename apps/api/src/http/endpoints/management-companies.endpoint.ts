import type { Hono } from 'hono'
import { ManagementCompaniesRepository } from '@database/repositories'
import { ManagementCompaniesController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class ManagementCompaniesEndpoint implements IEndpoint {
  readonly path = '/management-companies'
  private readonly controller: ManagementCompaniesController

  constructor(db: TDrizzleClient) {
    const repository = new ManagementCompaniesRepository(db)
    this.controller = new ManagementCompaniesController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
