import type { TManagementCompanyMember, TMemberPermissions } from '@packages/domain'
import type { ManagementCompanyMembersRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IUpdateMemberPermissionsInput {
  memberId: string
  permissions: TMemberPermissions
}

/**
 * Service for updating member permissions.
 */
export class UpdateMemberPermissionsService {
  constructor(private readonly membersRepository: ManagementCompanyMembersRepository) {}

  async execute(input: IUpdateMemberPermissionsInput): Promise<TServiceResult<TManagementCompanyMember>> {
    // Check if member exists
    const existing = await this.membersRepository.getById(input.memberId)

    if (!existing) {
      return failure('Member not found', 'NOT_FOUND')
    }

    // Check if member is active
    if (!existing.isActive) {
      return failure('Cannot update permissions for inactive member', 'BAD_REQUEST')
    }

    // Update permissions
    const updated = await this.membersRepository.updatePermissions(input.memberId, input.permissions)

    if (!updated) {
      return failure('Failed to update member permissions', 'INTERNAL_ERROR')
    }

    return success(updated)
  }
}
