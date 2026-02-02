import type { TUserInvitation, TUser, TUserRole } from '@packages/domain'
import type {
  UserInvitationsRepository,
  UsersRepository,
  UserRolesRepository,
} from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'

export interface IAcceptUserInvitationInput {
  token: string
  firebaseUid: string
}

export interface IAcceptUserInvitationResult {
  invitation: TUserInvitation
  user: TUser
  userRole: TUserRole | null
}

/**
 * Service for accepting a user invitation.
 * Updates the user with Firebase UID, activates user and user-role,
 * and marks the invitation as accepted.
 */
export class AcceptUserInvitationService {
  constructor(
    private readonly invitationsRepository: UserInvitationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly userRolesRepository: UserRolesRepository
  ) {}

  async execute(
    input: IAcceptUserInvitationInput
  ): Promise<TServiceResult<IAcceptUserInvitationResult>> {
    // Find invitation by token
    const invitation = await this.invitationsRepository.getByToken(input.token)

    if (!invitation) {
      return failure('Invalid invitation token', 'NOT_FOUND')
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return failure(`Invitation has already been ${invitation.status}`, 'BAD_REQUEST')
    }

    const now = new Date()
    if (invitation.expiresAt < now) {
      // Mark as expired
      await this.invitationsRepository.update(invitation.id, { status: 'expired' })
      return failure('Invitation has expired', 'BAD_REQUEST')
    }

    // Get user
    const user = await this.usersRepository.getById(invitation.userId)
    if (!user) {
      return failure('User not found', 'NOT_FOUND')
    }

    // Check if another user already has this Firebase UID
    const existingUserWithFirebaseUid = await this.usersRepository.getByFirebaseUid(input.firebaseUid)
    if (existingUserWithFirebaseUid && existingUserWithFirebaseUid.id !== user.id) {
      return failure('This account is already linked to another user', 'CONFLICT')
    }

    // Update user: set Firebase UID, activate, and verify email
    const updatedUser = await this.usersRepository.update(user.id, {
      firebaseUid: input.firebaseUid,
      isActive: true,
      isEmailVerified: true,
    })

    if (!updatedUser) {
      return failure('Failed to update user', 'INTERNAL_ERROR')
    }

    // Find and activate the user-role associated with this invitation
    let updatedUserRole: TUserRole | null = null
    const userRoles = await this.userRolesRepository.getByUserAndRole(
      user.id,
      invitation.roleId,
      invitation.condominiumId
    )

    if (userRoles.length > 0) {
      // Activate the first matching user-role
      updatedUserRole = await this.userRolesRepository.update(userRoles[0]!.id, {
        isActive: true,
      })
    }

    // Mark invitation as accepted
    const acceptedInvitation = await this.invitationsRepository.markAsAccepted(invitation.id)

    if (!acceptedInvitation) {
      return failure('Failed to accept invitation', 'INTERNAL_ERROR')
    }

    return success({
      invitation: acceptedInvitation,
      user: updatedUser,
      userRole: updatedUserRole,
    })
  }
}
