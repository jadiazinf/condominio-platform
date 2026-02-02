import type { Hono } from 'hono'
import {
  UserInvitationsRepository,
  UsersRepository,
  UserRolesRepository,
  RolesRepository,
  CondominiumsRepository,
} from '@database/repositories'
import { UserInvitationsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class UserInvitationsEndpoint implements IEndpoint {
  readonly path = '/user-invitations'
  private readonly controller: UserInvitationsController

  constructor(db: TDrizzleClient) {
    const invitationsRepository = new UserInvitationsRepository(db)
    const usersRepository = new UsersRepository(db)
    const userRolesRepository = new UserRolesRepository(db)
    const rolesRepository = new RolesRepository(db)
    const condominiumsRepository = new CondominiumsRepository(db)
    this.controller = new UserInvitationsController(
      invitationsRepository,
      usersRepository,
      userRolesRepository,
      rolesRepository,
      condominiumsRepository
    )
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
