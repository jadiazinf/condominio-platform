import type { UserRolesRepository, UserPermissionsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IDemoteFromSuperadminInput {
  userId: string
}

export interface IDemoteFromSuperadminResult {
  roleRemoved: boolean
  permissionsRemoved: number
}

/**
 * Service for demoting a user from superadmin.
 * Removes the SUPERADMIN user role and all associated permissions.
 */
export class DemoteFromSuperadminService {
  constructor(
    private readonly userRolesRepository: UserRolesRepository,
    private readonly userPermissionsRepository: UserPermissionsRepository
  ) {}

  async execute(
    input: IDemoteFromSuperadminInput
  ): Promise<TServiceResult<IDemoteFromSuperadminResult>> {
    try {
      const { userId } = input

      // Check if user is a superadmin
      const superadminRole = await this.userRolesRepository.getSuperadminUserRole(userId)
      if (!superadminRole) {
        return failure('User is not a superadmin', 'NOT_FOUND')
      }

      // Remove the superadmin role
      const roleRemoved = await this.userRolesRepository.delete(superadminRole.id)

      // Remove all user permissions (superadmins have permissions directly assigned)
      const permissionsRemoved = await this.userPermissionsRepository.removeAllByUser(userId)

      return success({
        roleRemoved,
        permissionsRemoved,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to demote user from superadmin'
      return failure(message, 'INTERNAL_ERROR')
    }
  }
}
