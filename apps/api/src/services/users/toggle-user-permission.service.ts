import type { TUserPermission } from '@packages/domain'
import type { UserPermissionsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IToggleUserPermissionInput {
  userId: string
  permissionId: string
  isEnabled: boolean
  assignedBy?: string
}

/**
 * Service for toggling a user's permission.
 */
export class ToggleUserPermissionService {
  constructor(private readonly repository: UserPermissionsRepository) {}

  async execute(input: IToggleUserPermissionInput): Promise<TServiceResult<TUserPermission>> {
    try {
      const result = await this.repository.togglePermission(
        input.userId,
        input.permissionId,
        input.isEnabled,
        input.assignedBy
      )

      if (!result) {
        return failure('Failed to toggle permission', 'INTERNAL_ERROR')
      }

      return success(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle permission'
      return failure(message, 'INTERNAL_ERROR')
    }
  }
}
