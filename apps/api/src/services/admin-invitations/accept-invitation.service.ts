import type {
  TAdminInvitation,
  TUser,
  TManagementCompany,
  TManagementCompanyMember,
  TManagementCompanySubscription,
} from '@packages/domain'
import type {
  AdminInvitationsRepository,
  UsersRepository,
  ManagementCompaniesRepository,
  ManagementCompanyMembersRepository,
  ManagementCompanySubscriptionsRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'

export interface IAcceptInvitationInput {
  token: string
  firebaseUid: string
}

export interface IAcceptInvitationResult {
  invitation: TAdminInvitation
  user: TUser
  managementCompany: TManagementCompany
  member: TManagementCompanyMember
  subscription: TManagementCompanySubscription
}

/**
 * Service for accepting an invitation.
 * Updates the user with Firebase UID, activates user and company,
 * creates member with primary admin role, creates trial subscription,
 * and marks the invitation as accepted.
 */
export class AcceptInvitationService {
  constructor(
    private readonly db: TDrizzleClient,
    private readonly invitationsRepository: AdminInvitationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly managementCompaniesRepository: ManagementCompaniesRepository,
    private readonly membersRepository: ManagementCompanyMembersRepository,
    private readonly subscriptionsRepository: ManagementCompanySubscriptionsRepository
  ) {}

  async execute(
    input: IAcceptInvitationInput
  ): Promise<TServiceResult<IAcceptInvitationResult>> {
    // Find invitation by token
    const invitation = await this.invitationsRepository.getByToken(input.token)

    if (!invitation) {
      return failure('Invalid invitation token', 'NOT_FOUND')
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return failure(
        `Invitation has already been ${invitation.status}`,
        'BAD_REQUEST'
      )
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

    // Get management company
    const managementCompany = await this.managementCompaniesRepository.getById(
      invitation.managementCompanyId
    )
    if (!managementCompany) {
      return failure('Management company not found', 'NOT_FOUND')
    }

    // Check if another user already has this Firebase UID
    const existingUserWithFirebaseUid = await this.usersRepository.getByFirebaseUid(
      input.firebaseUid
    )
    if (existingUserWithFirebaseUid && existingUserWithFirebaseUid.id !== user.id) {
      return failure(
        'This account is already linked to another user',
        'CONFLICT'
      )
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

    // Activate management company
    const updatedCompany = await this.managementCompaniesRepository.update(
      managementCompany.id,
      { isActive: true }
    )

    if (!updatedCompany) {
      return failure('Failed to update management company', 'INTERNAL_ERROR')
    }

    // Mark invitation as accepted
    const acceptedInvitation = await this.invitationsRepository.markAsAccepted(
      invitation.id
    )

    if (!acceptedInvitation) {
      return failure('Failed to accept invitation', 'INTERNAL_ERROR')
    }

    // Create member with primary admin role
    const member = await this.membersRepository.create({
      managementCompanyId: managementCompany.id,
      userId: updatedUser.id,
      roleName: 'admin',
      permissions: {
        can_change_subscription: true,
        can_manage_members: true,
        can_create_tickets: true,
        can_view_invoices: true,
      },
      isPrimaryAdmin: true,
      joinedAt: new Date(),
      invitedAt: invitation.createdAt,
      invitedBy: invitation.createdBy,
      isActive: true,
      deactivatedAt: null,
      deactivatedBy: null,
    })

    if (!member) {
      return failure('Failed to create member', 'INTERNAL_ERROR')
    }

    // Create trial subscription (30 days)
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 30)

    const subscription = await this.subscriptionsRepository.create({
      managementCompanyId: managementCompany.id,
      subscriptionName: 'Trial Subscription',
      billingCycle: 'monthly',
      basePrice: 0, // Free during trial
      currencyId: null,
      maxCondominiums: null, // No limits during trial
      maxUsers: null,
      maxStorageGb: null,
      customFeatures: null,
      customRules: null,
      status: 'trial',
      startDate: new Date(),
      endDate: null,
      nextBillingDate: trialEndsAt,
      trialEndsAt,
      autoRenew: false,
      notes: 'Automatically created trial subscription',
      createdBy: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
    })

    if (!subscription) {
      return failure('Failed to create trial subscription', 'INTERNAL_ERROR')
    }

    return success({
      invitation: acceptedInvitation,
      user: updatedUser,
      managementCompany: updatedCompany,
      member,
      subscription,
    })
  }
}
