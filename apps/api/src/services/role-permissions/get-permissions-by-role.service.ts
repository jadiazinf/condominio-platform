import type { TRolePermission } from '@packages/domain'
import type { RolePermissionsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetPermissionsByRoleInput {
  roleId: string
}

export class GetPermissionsByRoleService {
  constructor(private readonly repository: RolePermissionsRepository) {}

  async execute(input: IGetPermissionsByRoleInput): Promise<TServiceResult<TRolePermission[]>> {
    const rolePermissions = await this.repository.getByRoleId(input.roleId)
    return success(rolePermissions)
  }
}
