import type { TAdminInvitation } from '@packages/domain'
import type { AdminInvitationsRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IGetInvitationByTokenInput {
  token: string
}

/**
 * Service for retrieving an invitation by its token.
 */
export class GetInvitationByTokenService {
  constructor(private readonly repository: AdminInvitationsRepository) {}

  async execute(
    input: IGetInvitationByTokenInput
  ): Promise<TServiceResult<TAdminInvitation>> {
    const invitation = await this.repository.getByToken(input.token)

    if (!invitation) {
      return failure('Invitation not found', 'NOT_FOUND')
    }

    return success(invitation)
  }
}
