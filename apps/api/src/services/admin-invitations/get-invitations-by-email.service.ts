import type { TAdminInvitation } from '@packages/domain'
import type { AdminInvitationsRepository } from '@database/repositories'
import { type TServiceResult, success } from '../base.service'

export interface IGetInvitationsByEmailInput {
  email: string
}

/**
 * Service for retrieving pending invitations by email.
 * Useful for showing available invitations during signup.
 */
export class GetInvitationsByEmailService {
  constructor(private readonly repository: AdminInvitationsRepository) {}

  async execute(
    input: IGetInvitationsByEmailInput
  ): Promise<TServiceResult<TAdminInvitation[]>> {
    const invitations = await this.repository.getPendingByEmail(input.email)
    return success(invitations)
  }
}
