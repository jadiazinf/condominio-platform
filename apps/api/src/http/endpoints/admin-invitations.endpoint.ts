import type { Hono } from 'hono'
import {
  AdminInvitationsRepository,
  UsersRepository,
  ManagementCompaniesRepository,
  ManagementCompanyMembersRepository,
  ManagementCompanySubscriptionsRepository,
} from '@database/repositories'
import { AdminInvitationsController } from '../controllers'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class AdminInvitationsEndpoint implements IEndpoint {
  readonly path = '/admin-invitations'
  private readonly controller: AdminInvitationsController

  constructor(db: TDrizzleClient) {
    const invitationsRepository = new AdminInvitationsRepository(db)
    const usersRepository = new UsersRepository(db)
    const managementCompaniesRepository = new ManagementCompaniesRepository(db)
    const membersRepository = new ManagementCompanyMembersRepository(db)
    const subscriptionsRepository = new ManagementCompanySubscriptionsRepository(db)
    this.controller = new AdminInvitationsController(
      db,
      invitationsRepository,
      usersRepository,
      managementCompaniesRepository,
      membersRepository,
      subscriptionsRepository
    )
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
