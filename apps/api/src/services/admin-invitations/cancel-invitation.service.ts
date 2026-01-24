import type { TAdminInvitation } from '@packages/domain'
import type { AdminInvitationsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface ICancelInvitationInput {
  invitationId: string
}

/**
 * Service for cancelling an invitation.
 * Can only cancel pending invitations.
 */
export class CancelInvitationService {
  constructor(private readonly repository: AdminInvitationsRepository) {}

  async execute(
    input: ICancelInvitationInput
  ): Promise<TServiceResult<TAdminInvitation>> {
    const invitation = await this.repository.getById(input.invitationId)

    if (!invitation) {
      return failure('Invitation not found', 'NOT_FOUND')
    }

    if (invitation.status !== 'pending') {
      return failure(
        `Cannot cancel invitation with status: ${invitation.status}`,
        'BAD_REQUEST'
      )
    }

    const cancelled = await this.repository.markAsCancelled(input.invitationId)

    if (!cancelled) {
      return failure('Failed to cancel invitation', 'INTERNAL_ERROR')
    }

    return success(cancelled)
  }
}
