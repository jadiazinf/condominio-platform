import type { TAdminInvitation, TUser, TManagementCompany } from '@packages/domain'
import type {
  AdminInvitationsRepository,
  UsersRepository,
  ManagementCompaniesRepository,
} from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'
import logger from '@utils/logger'

export interface IValidateInvitationTokenInput {
  token: string
}

export interface IValidateInvitationTokenResult {
  invitation: TAdminInvitation
  user: TUser
  managementCompany: TManagementCompany
  isExpired: boolean
  isValid: boolean
}

/**
 * Service for validating invitation tokens.
 * Returns invitation details and validity status.
 */
export class ValidateInvitationTokenService {
  constructor(
    private readonly invitationsRepository: AdminInvitationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly managementCompaniesRepository: ManagementCompaniesRepository
  ) {}

  async execute(
    input: IValidateInvitationTokenInput
  ): Promise<TServiceResult<IValidateInvitationTokenResult>> {
    // Find invitation by token
    logger.info(
      {
        tokenLength: input.token.length,
        tokenPrefix: input.token.substring(0, 8),
      },
      'Validating invitation token'
    )

    const invitation = await this.invitationsRepository.getByToken(input.token)

    if (!invitation) {
      logger.warn(
        {
          tokenLength: input.token.length,
          tokenPrefix: input.token.substring(0, 8),
        },
        'Invitation token not found in database'
      )
      return failure('Invalid invitation token', 'NOT_FOUND')
    }

    logger.info(
      {
        invitationId: invitation.id,
        status: invitation.status,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
      },
      'Invitation token found'
    )

    // Get related data (include inactive users — invitation users are inactive until accepted)
    const user = await this.usersRepository.getById(invitation.userId, true)
    if (!user) {
      return failure('User associated with invitation not found', 'NOT_FOUND')
    }

    // Include inactive — company is inactive until invitation accepted
    const managementCompany = await this.managementCompaniesRepository.getById(
      invitation.managementCompanyId, true
    )
    if (!managementCompany) {
      return failure('Management company associated with invitation not found', 'NOT_FOUND')
    }

    // Check expiration
    const now = new Date()
    const isExpired = invitation.expiresAt < now

    // Check if already used or cancelled
    const isValid =
      invitation.status === 'pending' && !isExpired

    return success({
      invitation,
      user,
      managementCompany,
      isExpired,
      isValid,
    })
  }
}
