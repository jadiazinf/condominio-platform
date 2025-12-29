import type { TUserRole } from '@packages/domain'
import type { UserRolesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetRolesByUserAndCondominiumInput {
  userId: string
  condominiumId: string
}

/**
 * Service for retrieving user roles scoped to a specific condominium.
 */
export class GetRolesByUserAndCondominiumService {
  constructor(private readonly repository: UserRolesRepository) {}

  async execute(input: IGetRolesByUserAndCondominiumInput): Promise<TServiceResult<TUserRole[]>> {
    const userRoles = await this.repository.getByUserAndCondominium(
      input.userId,
      input.condominiumId
    )
    return success(userRoles)
  }
}
