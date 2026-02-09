import type { Hono } from 'hono'
import {
  UserInvitationsRepository,
  UsersRepository,
  UserRolesRepository,
  UserPermissionsRepository,
  RolesRepository,
  CondominiumsRepository,
  PermissionsRepository,
} from '@database/repositories'
import { UserInvitationsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class UserInvitationsEndpoint implements IEndpoint {
  readonly path = '/condominium/user-invitations'
  private readonly controller: UserInvitationsController

  constructor(db: TDrizzleClient) {
    const invitationsRepository = new UserInvitationsRepository(db)
    const usersRepository = new UsersRepository(db)
    const userRolesRepository = new UserRolesRepository(db)
    const userPermissionsRepository = new UserPermissionsRepository(db)
    const rolesRepository = new RolesRepository(db)
    const condominiumsRepository = new CondominiumsRepository(db)
    const permissionsRepository = new PermissionsRepository(db)
    this.controller = new UserInvitationsController(
      db,
      invitationsRepository,
      usersRepository,
      userRolesRepository,
      userPermissionsRepository,
      rolesRepository,
      condominiumsRepository,
      permissionsRepository
    )
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
