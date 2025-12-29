import type { RolePermissionsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface ICheckRolePermissionExistsInput {
  roleId: string
  permissionId: string
}

export interface ICheckRolePermissionExistsOutput {
  exists: boolean
}

export class CheckRolePermissionExistsService {
  constructor(private readonly repository: RolePermissionsRepository) {}

  async execute(
    input: ICheckRolePermissionExistsInput
  ): Promise<TServiceResult<ICheckRolePermissionExistsOutput>> {
    const exists = await this.repository.exists(input.roleId, input.permissionId)
    return success({ exists })
  }
}
