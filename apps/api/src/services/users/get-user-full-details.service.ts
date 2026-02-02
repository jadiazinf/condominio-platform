import type { UsersRepository, TUserFullDetails } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGetUserFullDetailsInput {
  userId: string
}

/**
 * Service for getting full user details including roles, condominiums, and permissions.
 */
export class GetUserFullDetailsService {
  constructor(private readonly repository: UsersRepository) {}

  async execute(input: IGetUserFullDetailsInput): Promise<TServiceResult<TUserFullDetails>> {
    try {
      const result = await this.repository.getUserFullDetails(input.userId)

      if (!result) {
        return failure('User not found', 'NOT_FOUND')
      }

      return success(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get user details'
      return failure(message, 'INTERNAL_ERROR')
    }
  }
}
