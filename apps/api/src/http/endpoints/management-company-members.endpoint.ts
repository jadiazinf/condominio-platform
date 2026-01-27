import type { Hono } from 'hono'
import { ManagementCompanyMembersRepository } from '@database/repositories'
import { ManagementCompanyMembersController } from '../controllers/management-company-members/members.controller'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class ManagementCompanyMembersEndpoint implements IEndpoint {
  readonly path = ''
  private readonly controller: ManagementCompanyMembersController

  constructor(db: TDrizzleClient) {
    const repository = new ManagementCompanyMembersRepository(db)
    this.controller = new ManagementCompanyMembersController(repository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
