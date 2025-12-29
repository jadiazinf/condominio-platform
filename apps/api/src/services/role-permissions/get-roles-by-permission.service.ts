import type { TRolePermission } from '@packages/domain'
import type { RolePermissionsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetRolesByPermissionInput {
  permissionId: string
}

export class GetRolesByPermissionService {
  constructor(private readonly repository: RolePermissionsRepository) {}

  async execute(input: IGetRolesByPermissionInput): Promise<TServiceResult<TRolePermission[]>> {
    const rolePermissions = await this.repository.getByPermissionId(input.permissionId)
    return success(rolePermissions)
  }
}
