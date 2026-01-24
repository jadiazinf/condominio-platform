import type { TAdminInvitation, TUser, TManagementCompany } from '@packages/domain'
import type { AdminInvitationsRepository, UsersRepository, ManagementCompaniesRepository } from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'
import { generateSecureToken, hashToken, calculateExpirationDate } from '../../utils/token'

export interface ICreateAdminInvitationInput {
  userId: string
  managementCompanyId: string
  email: string
  createdBy: string
  expirationDays?: number
}

export interface ICreateAdminInvitationResult {
  invitation: TAdminInvitation
  token: string // Plain text token to send via email
  user: TUser
  managementCompany: TManagementCompany
}

/**
 * Service for creating admin invitations.
 * Generates a secure token and creates the invitation record.
 */
export class CreateAdminInvitationService {
  constructor(
    private readonly invitationsRepository: AdminInvitationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly managementCompaniesRepository: ManagementCompaniesRepository
  ) {}

  async execute(
    input: ICreateAdminInvitationInput
  ): Promise<TServiceResult<ICreateAdminInvitationResult>> {
    // Validate user exists
    const user = await this.usersRepository.getById(input.userId)
    if (!user) {
      return failure('User not found', 'NOT_FOUND')
    }

    // Validate management company exists
    const managementCompany = await this.managementCompaniesRepository.getById(
      input.managementCompanyId
    )
    if (!managementCompany) {
      return failure('Management company not found', 'NOT_FOUND')
    }

    // Check if there's already a pending invitation for this user and company
    const hasPending = await this.invitationsRepository.hasPendingInvitation(
      input.userId,
      input.managementCompanyId
    )
    if (hasPending) {
      return failure(
        'An active invitation already exists for this user and company',
        'CONFLICT'
      )
    }

    // Generate secure token
    const token = generateSecureToken()
    const tokenHash = hashToken(token)
    const expiresAt = calculateExpirationDate(input.expirationDays ?? 7)

    // Create the invitation
    const invitation = await this.invitationsRepository.create({
      userId: input.userId,
      managementCompanyId: input.managementCompanyId,
      token,
      tokenHash,
      status: 'pending',
      email: input.email,
      expiresAt,
      acceptedAt: null,
      emailError: null,
      createdBy: input.createdBy,
    })

    return success({
      invitation,
      token, // Return plain text token to be sent via email
      user,
      managementCompany,
    })
  }
}
