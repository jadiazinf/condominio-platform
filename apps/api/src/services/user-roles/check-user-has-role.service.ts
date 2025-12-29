import type { UserRolesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface ICheckUserHasRoleInput {
  userId: string
  roleId: string
  condominiumId?: string
  buildingId?: string
}

export interface ICheckUserHasRoleOutput {
  hasRole: boolean
}

/**
 * Service for checking if a user has a specific role.
 * Can optionally filter by condominium and/or building scope.
 */
export class CheckUserHasRoleService {
  constructor(private readonly repository: UserRolesRepository) {}

  async execute(input: ICheckUserHasRoleInput): Promise<TServiceResult<ICheckUserHasRoleOutput>> {
    const hasRole = await this.repository.userHasRole(
      input.userId,
      input.roleId,
      input.condominiumId,
      input.buildingId
    )
    return success({ hasRole })
  }
}
