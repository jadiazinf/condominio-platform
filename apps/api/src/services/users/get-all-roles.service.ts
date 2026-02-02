import type { UsersRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IRoleOption {
  id: string
  name: string
  isSystemRole: boolean
}

/**
 * Service for getting all roles in the system.
 */
export class GetAllRolesService {
  constructor(private readonly repository: UsersRepository) {}

  async execute(): Promise<TServiceResult<IRoleOption[]>> {
    try {
      const result = await this.repository.getAllRoles()
      return success(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get roles'
      return failure(message, 'INTERNAL_ERROR')
    }
  }
}
