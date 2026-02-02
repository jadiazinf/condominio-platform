import type { TPaginatedResponse } from '@packages/domain'
import type { UsersRepository, TUserWithRoles, TAllUsersQuery } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IListAllUsersPaginatedInput {
  query: TAllUsersQuery
}

/**
 * Service for listing all users with pagination and filtering.
 */
export class ListAllUsersPaginatedService {
  constructor(private readonly repository: UsersRepository) {}

  async execute(
    input: IListAllUsersPaginatedInput
  ): Promise<TServiceResult<TPaginatedResponse<TUserWithRoles>>> {
    try {
      const result = await this.repository.listAllUsersPaginated(input.query)
      return success(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list users'
      return failure(message, 'INTERNAL_ERROR')
    }
  }
}
