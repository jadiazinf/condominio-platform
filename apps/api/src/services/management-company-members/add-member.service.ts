import {
  type TManagementCompanyMember,
  type TMemberRole,
  type TMemberPermissions,
  type TSystemRole,
  ESystemRole,
} from '@packages/domain'
import type {
  ManagementCompanyMembersRepository,
  UserRolesRepository,
  RolesRepository,
} from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IAddMemberInput {
  managementCompanyId: string
  userId: string
  role: TMemberRole
  permissions?: TMemberPermissions
  isPrimary?: boolean
  invitedBy?: string
}

/**
 * Maps a TMemberRole to the unified role name in the roles table.
 */
const MEMBER_ROLE_TO_SYSTEM_ROLE: Record<TMemberRole, TSystemRole> = {
  admin: ESystemRole.ADMIN,
  accountant: ESystemRole.ACCOUNTANT,
  support: ESystemRole.SUPPORT,
  viewer: ESystemRole.VIEWER,
}

/**
 * Service for adding a new member to a management company.
 */
export class AddMemberService {
  constructor(
    private readonly membersRepository: ManagementCompanyMembersRepository,
    private readonly userRolesRepository: UserRolesRepository,
    private readonly rolesRepository: RolesRepository
  ) {}

  async execute(input: IAddMemberInput): Promise<TServiceResult<TManagementCompanyMember>> {
    // Check if primary admin already exists (if trying to add as primary)
    if (input.isPrimary) {
      const existingPrimary = await this.membersRepository.getPrimaryAdmin(input.managementCompanyId)

      if (existingPrimary) {
        return failure('Management company already has a primary admin', 'CONFLICT')
      }
    }

    // Look up the system role for this member role
    const systemRoleName = MEMBER_ROLE_TO_SYSTEM_ROLE[input.role]
    const role = await this.rolesRepository.getByName(systemRoleName)
    if (!role) {
      return failure(`${systemRoleName} role not found in system`, 'INTERNAL_ERROR')
    }

    // Create MC-scoped role in user_roles (unified role system)
    const mcRoleAssignment = await this.userRolesRepository.createManagementCompanyRole(
      input.userId,
      role.id,
      input.managementCompanyId,
      input.invitedBy
    )

    // Get default permissions for role if not provided
    const permissions = input.permissions ?? this.getDefaultPermissions(input.role)

    // Add member with link to unified user_role
    const member = await this.membersRepository.addMember(
      input.managementCompanyId,
      input.userId,
      input.role,
      input.isPrimary ?? false,
      permissions,
      input.invitedBy,
      mcRoleAssignment.id
    )

    return success(member)
  }

  private getDefaultPermissions(role: TMemberRole): TMemberPermissions {
    switch (role) {
      case 'admin':
        return {
          can_change_subscription: true,
          can_manage_members: true,
          can_create_tickets: true,
          can_view_invoices: true,
        }
      case 'accountant':
        return {
          can_change_subscription: true,
          can_manage_members: false,
          can_create_tickets: true,
          can_view_invoices: true,
        }
      case 'support':
        return {
          can_change_subscription: false,
          can_manage_members: false,
          can_create_tickets: true,
          can_view_invoices: false,
        }
      case 'viewer':
        return {
          can_change_subscription: false,
          can_manage_members: false,
          can_create_tickets: true,
          can_view_invoices: false,
        }
    }
  }
}
