import type { TUserRole } from '@packages/domain'
import type { UserRolesRepository, UserPermissionsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IPromoteToSuperadminInput {
  userId: string
  permissionIds: string[]
  assignedBy: string
}

export interface IPromoteToSuperadminResult {
  userRole: TUserRole
  permissionsAssigned: number
}

/**
 * Service for promoting a user to superadmin.
 * Creates a SUPERADMIN user role and assigns the specified permissions.
 */
export class PromoteToSuperadminService {
  constructor(
    private readonly userRolesRepository: UserRolesRepository,
    private readonly userPermissionsRepository: UserPermissionsRepository
  ) {}

  async execute(
    input: IPromoteToSuperadminInput
  ): Promise<TServiceResult<IPromoteToSuperadminResult>> {
    try {
      const { userId, permissionIds, assignedBy } = input

      // Get the SUPERADMIN role ID
      const superadminRoleId = await this.userRolesRepository.getSuperadminRoleId()
      if (!superadminRoleId) {
        return failure('SUPERADMIN role not found in the system', 'NOT_FOUND')
      }

      // Check if user is already a superadmin
      const existingRole = await this.userRolesRepository.getSuperadminUserRole(userId)
      if (existingRole) {
        return failure('User is already a superadmin', 'CONFLICT')
      }

      // Create the user role
      const userRole = await this.userRolesRepository.create({
        userId,
        roleId: superadminRoleId,
        condominiumId: null,
        buildingId: null,
        managementCompanyId: null,
        isActive: true,
        assignedBy,
        registeredBy: assignedBy,
        notes: 'Promoted to superadmin',
        expiresAt: null,
      })

      if (!userRole) {
        return failure('Failed to create superadmin role assignment', 'INTERNAL_ERROR')
      }

      // Assign permissions to the user
      let permissionsAssigned = 0
      for (const permissionId of permissionIds) {
        const result = await this.userPermissionsRepository.togglePermission(
          userId,
          permissionId,
          true,
          assignedBy
        )
        if (result) {
          permissionsAssigned++
        }
      }

      return success({
        userRole,
        permissionsAssigned,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to promote user to superadmin'
      return failure(message, 'INTERNAL_ERROR')
    }
  }
}
