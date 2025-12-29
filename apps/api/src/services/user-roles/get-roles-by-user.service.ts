import type { TUserRole } from '@packages/domain'
import type { UserRolesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetRolesByUserInput {
  userId: string
}

/**
 * Service for retrieving all roles assigned to a user.
 */
export class GetRolesByUserService {
  constructor(private readonly repository: UserRolesRepository) {}

  async execute(input: IGetRolesByUserInput): Promise<TServiceResult<TUserRole[]>> {
    const userRoles = await this.repository.getByUserId(input.userId)
    return success(userRoles)
  }
}
