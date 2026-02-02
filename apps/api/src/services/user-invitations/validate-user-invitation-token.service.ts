import type { TUserInvitation, TUser, TCondominium, TRole } from '@packages/domain'
import type {
  UserInvitationsRepository,
  UsersRepository,
  CondominiumsRepository,
  RolesRepository,
} from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IValidateUserInvitationTokenInput {
  token: string
}

export interface IValidateUserInvitationTokenResult {
  isValid: boolean
  isExpired: boolean
  invitation: TUserInvitation
  user: TUser
  condominium: TCondominium | null
  role: TRole
}

/**
 * Service for validating a user invitation token.
 * Returns information about the invitation status without accepting it.
 */
export class ValidateUserInvitationTokenService {
  constructor(
    private readonly invitationsRepository: UserInvitationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly condominiumsRepository: CondominiumsRepository,
    private readonly rolesRepository: RolesRepository
  ) {}

  async execute(
    input: IValidateUserInvitationTokenInput
  ): Promise<TServiceResult<IValidateUserInvitationTokenResult>> {
    // Find invitation by token
    const invitation = await this.invitationsRepository.getByToken(input.token)

    if (!invitation) {
      return failure('Invalid invitation token', 'NOT_FOUND')
    }

    // Get user
    const user = await this.usersRepository.getById(invitation.userId)
    if (!user) {
      return failure('User associated with invitation not found', 'NOT_FOUND')
    }

    // Get condominium (if exists)
    let condominium: TCondominium | null = null
    if (invitation.condominiumId) {
      condominium = await this.condominiumsRepository.getById(invitation.condominiumId)
    }

    // Get role
    const role = await this.rolesRepository.getById(invitation.roleId)
    if (!role) {
      return failure('Role associated with invitation not found', 'NOT_FOUND')
    }

    // Check if invitation has expired
    const now = new Date()
    const isExpired = invitation.expiresAt < now

    // Check if invitation is still valid (pending and not expired)
    const isValid = invitation.status === 'pending' && !isExpired

    return success({
      isValid,
      isExpired,
      invitation,
      user,
      condominium,
      role,
    })
  }
}
