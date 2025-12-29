import type { TPermission } from '@packages/domain'
import type { PermissionsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGetPermissionByModuleAndActionInput {
  module: string
  action: string
}

export class GetPermissionByModuleAndActionService {
  constructor(private readonly repository: PermissionsRepository) {}

  async execute(input: IGetPermissionByModuleAndActionInput): Promise<TServiceResult<TPermission>> {
    const permission = await this.repository.getByModuleAndAction(input.module, input.action)

    if (!permission) {
      return failure('Permission not found', 'NOT_FOUND')
    }

    return success(permission)
  }
}
