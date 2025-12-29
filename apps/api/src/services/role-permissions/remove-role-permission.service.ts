import type { RolePermissionsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IRemoveRolePermissionInput {
  roleId: string
  permissionId: string
}

export class RemoveRolePermissionService {
  constructor(private readonly repository: RolePermissionsRepository) {}

  async execute(input: IRemoveRolePermissionInput): Promise<TServiceResult<void>> {
    const removed = await this.repository.removeByRoleAndPermission(
      input.roleId,
      input.permissionId
    )

    if (!removed) {
      return failure('Role-permission assignment not found', 'NOT_FOUND')
    }

    return success(undefined)
  }
}
