import type { Hono } from 'hono'
import { ManagementCompanyMembersRepository, UserRolesRepository, RolesRepository } from '@database/repositories'
import { ManagementCompanyMembersController } from '../controllers/management-company-members/members.controller'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class ManagementCompanyMembersEndpoint implements IEndpoint {
  readonly path = ''
  private readonly controller: ManagementCompanyMembersController

  constructor(db: TDrizzleClient) {
    const repository = new ManagementCompanyMembersRepository(db)
    const userRolesRepository = new UserRolesRepository(db)
    const rolesRepository = new RolesRepository(db)
    this.controller = new ManagementCompanyMembersController(repository, userRolesRepository, rolesRepository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
