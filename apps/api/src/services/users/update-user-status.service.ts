import type { TUser } from '@packages/domain'
import type { UsersRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IUpdateUserStatusInput {
  userId: string
  isActive: boolean
}

/**
 * Service for updating user status (isActive).
 */
export class UpdateUserStatusService {
  constructor(private readonly repository: UsersRepository) {}

  async execute(input: IUpdateUserStatusInput): Promise<TServiceResult<TUser>> {
    try {
      const result = await this.repository.updateStatus(input.userId, input.isActive)

      if (!result) {
        return failure('User not found', 'NOT_FOUND')
      }

      return success(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user status'
      return failure(message, 'INTERNAL_ERROR')
    }
  }
}
