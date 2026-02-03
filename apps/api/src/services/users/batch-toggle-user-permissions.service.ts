import type { UserPermissionsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IBatchToggleUserPermissionsInput {
  userId: string
  changes: Array<{ permissionId: string; isEnabled: boolean }>
  assignedBy?: string
}

export interface IBatchToggleUserPermissionsOutput {
  updated: number
  failed: number
}

/**
 * Service for batch toggling multiple user permissions in a single operation.
 */
export class BatchToggleUserPermissionsService {
  constructor(private readonly repository: UserPermissionsRepository) {}

  async execute(
    input: IBatchToggleUserPermissionsInput
  ): Promise<TServiceResult<IBatchToggleUserPermissionsOutput>> {
    try {
      if (!input.changes || input.changes.length === 0) {
        return failure('No changes provided', 'BAD_REQUEST')
      }

      const result = await this.repository.batchTogglePermissions(
        input.userId,
        input.changes,
        input.assignedBy
      )

      return success(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to batch toggle permissions'
      return failure(message, 'INTERNAL_ERROR')
    }
  }
}
