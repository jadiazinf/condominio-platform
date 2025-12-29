import type { TPermission } from '@packages/domain'
import type { PermissionsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetPermissionsByModuleInput {
  module: string
}

export class GetPermissionsByModuleService {
  constructor(private readonly repository: PermissionsRepository) {}

  async execute(input: IGetPermissionsByModuleInput): Promise<TServiceResult<TPermission[]>> {
    const permissions = await this.repository.getByModule(input.module)
    return success(permissions)
  }
}
