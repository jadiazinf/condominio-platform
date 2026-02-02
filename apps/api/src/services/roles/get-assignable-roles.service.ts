import type { TRole } from '@packages/domain'
import type { RolesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

/**
 * Service to retrieve roles that can be assigned to condominium users.
 * Returns all roles except SUPERADMIN, which is only assignable globally.
 */
export class GetAssignableRolesService {
  constructor(private readonly repository: RolesRepository) {}

  async execute(): Promise<TServiceResult<TRole[]>> {
    const roles = await this.repository.getAssignableRoles()
    return success(roles)
  }
}
