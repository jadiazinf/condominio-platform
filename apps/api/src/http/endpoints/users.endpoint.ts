import type { Hono } from 'hono'
import { UsersRepository, UserPermissionsRepository, UserRolesRepository, ManagementCompanyMembersRepository } from '@database/repositories'
import { UsersController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class UsersEndpoint implements IEndpoint {
  readonly path = '/platform/users'
  private readonly controller: UsersController

  constructor(db: TDrizzleClient) {
    const repository = new UsersRepository(db)
    const userPermissionsRepository = new UserPermissionsRepository(db)
    const userRolesRepository = new UserRolesRepository(db)
    const managementCompanyMembersRepository = new ManagementCompanyMembersRepository(db)
    this.controller = new UsersController(repository, db, userPermissionsRepository, userRolesRepository, managementCompanyMembersRepository)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
