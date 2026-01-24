import type { TAdminInvitation, TUser, TManagementCompany } from '@packages/domain'
import type {
  AdminInvitationsRepository,
  UsersRepository,
  ManagementCompaniesRepository,
} from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

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
    const invitation = await this.invitationsRepository.getByToken(input.token)

    if (!invitation) {
      return failure('Invalid invitation token', 'NOT_FOUND')
    }

    // Get related data
    const user = await this.usersRepository.getById(invitation.userId)
    if (!user) {
      return failure('User associated with invitation not found', 'NOT_FOUND')
    }

    const managementCompany = await this.managementCompaniesRepository.getById(
      invitation.managementCompanyId
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
