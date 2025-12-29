import type { TUserRole } from '@packages/domain'
import type { UserRolesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetRolesByUserAndBuildingInput {
  userId: string
  buildingId: string
}

/**
 * Service for retrieving user roles scoped to a specific building.
 */
export class GetRolesByUserAndBuildingService {
  constructor(private readonly repository: UserRolesRepository) {}

  async execute(input: IGetRolesByUserAndBuildingInput): Promise<TServiceResult<TUserRole[]>> {
    const userRoles = await this.repository.getByUserAndBuilding(input.userId, input.buildingId)
    return success(userRoles)
  }
}
