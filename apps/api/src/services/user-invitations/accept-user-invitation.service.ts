import type { TUserInvitation, TUser, TUserRole } from '@packages/domain'
import type {
  UserInvitationsRepository,
  UsersRepository,
  UserRolesRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
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
    private readonly db: TDrizzleClient,
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

    // Get user (include inactive — invitation users are inactive until accepted)
    const user = await this.usersRepository.getById(invitation.userId, true)
    if (!user) {
      return failure('User not found', 'NOT_FOUND')
    }

    // Check if another user already has this Firebase UID (read, outside transaction)
    const existingUserWithFirebaseUid = await this.usersRepository.getByFirebaseUid(input.firebaseUid)
    if (existingUserWithFirebaseUid && existingUserWithFirebaseUid.id !== user.id) {
      return failure('This account is already linked to another user', 'CONFLICT')
    }

    // Find the user-role associated with this invitation (read, outside transaction)
    const userRoles = await this.userRolesRepository.getByUserAndRole(
      user.id,
      invitation.roleId,
      invitation.condominiumId
    )

    // All writes inside a transaction (auto-rollback on failure)
    return await this.db.transaction(async (tx) => {
      const txUsersRepo = this.usersRepository.withTx(tx)
      const txUserRolesRepo = this.userRolesRepository.withTx(tx)
      const txInvitationsRepo = this.invitationsRepository.withTx(tx)

      // Update user: set Firebase UID, activate, and verify email
      const updatedUser = await txUsersRepo.update(user.id, {
        firebaseUid: input.firebaseUid,
        isActive: true,
        isEmailVerified: true,
      })

      if (!updatedUser) {
        return failure('Failed to update user', 'INTERNAL_ERROR')
      }

      // Activate the first matching user-role
      let updatedUserRole: TUserRole | null = null
      if (userRoles.length > 0) {
        updatedUserRole = await txUserRolesRepo.update(userRoles[0]!.id, {
          isActive: true,
        })
      }

      // Mark invitation as accepted
      const acceptedInvitation = await txInvitationsRepo.markAsAccepted(invitation.id)

      if (!acceptedInvitation) {
        return failure('Failed to accept invitation', 'INTERNAL_ERROR')
      }

      return success({
        invitation: acceptedInvitation,
        user: updatedUser,
        userRole: updatedUserRole,
      })
    })
  }
}
