import type { Hono } from 'hono'
import {
  UnitOwnershipsRepository,
  UsersRepository,
  UserRolesRepository,
  UserInvitationsRepository,
  RolesRepository,
  UnitsRepository,
  CondominiumsRepository,
} from '@database/repositories'
import { UnitOwnershipsController } from '../controllers'
import { AddUnitOwnerService } from '@services/unit-ownerships/add-unit-owner.service'
import type { IEndpoint } from './types'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export class UnitOwnershipsEndpoint implements IEndpoint {
  readonly path = '/condominium/unit-ownerships'
  private readonly controller: UnitOwnershipsController

  constructor(db: TDrizzleClient) {
    const repository = new UnitOwnershipsRepository(db)
    const usersRepository = new UsersRepository(db)
    const userRolesRepository = new UserRolesRepository(db)
    const userInvitationsRepository = new UserInvitationsRepository(db)
    const rolesRepository = new RolesRepository(db)
    const unitsRepository = new UnitsRepository(db)
    const condominiumsRepository = new CondominiumsRepository(db)

    const addUnitOwnerService = new AddUnitOwnerService(
      db,
      repository,
      usersRepository,
      userRolesRepository,
      userInvitationsRepository,
      rolesRepository,
      unitsRepository,
      condominiumsRepository
    )

    this.controller = new UnitOwnershipsController(repository, addUnitOwnerService)
  }

  getRouter(): Hono {
    return this.controller.createRouter()
  }
}
