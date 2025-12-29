import type { TRole } from '@packages/domain'
import type { RolesRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export class GetSystemRolesService {
  constructor(private readonly repository: RolesRepository) {}

  async execute(): Promise<TServiceResult<TRole[]>> {
    const roles = await this.repository.getSystemRoles()
    return success(roles)
  }
}
