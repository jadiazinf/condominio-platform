import type {
  TManagementCompanyMember,
  TMemberRole,
  TMemberPermissions,
} from '@packages/domain'
import type { ManagementCompanyMembersRepository } from '@database/repositories'
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
 * Service for adding a new member to a management company.
 */
export class AddMemberService {
  constructor(private readonly membersRepository: ManagementCompanyMembersRepository) {}

  async execute(input: IAddMemberInput): Promise<TServiceResult<TManagementCompanyMember>> {
    // Check if primary admin already exists (if trying to add as primary)
    if (input.isPrimary) {
      const existingPrimary = await this.membersRepository.getPrimaryAdmin(input.managementCompanyId)

      if (existingPrimary) {
        return failure('Management company already has a primary admin', 'CONFLICT')
      }
    }

    // Get default permissions for role if not provided
    const permissions = input.permissions ?? this.getDefaultPermissions(input.role)

    // Add member
    const member = await this.membersRepository.addMember(
      input.managementCompanyId,
      input.userId,
      input.role,
      input.isPrimary ?? false,
      permissions,
      input.invitedBy
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
