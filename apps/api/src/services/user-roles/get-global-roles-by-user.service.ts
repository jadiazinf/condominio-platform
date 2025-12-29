import type { TUserRole } from '@packages/domain'
import type { UserRolesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetGlobalRolesByUserInput {
  userId: string
}

/**
 * Service for retrieving global roles for a user.
 * Global roles are those without condominium or building scope.
 */
export class GetGlobalRolesByUserService {
  constructor(private readonly repository: UserRolesRepository) {}

  async execute(input: IGetGlobalRolesByUserInput): Promise<TServiceResult<TUserRole[]>> {
    const userRoles = await this.repository.getGlobalRolesByUser(input.userId)
    return success(userRoles)
  }
}
