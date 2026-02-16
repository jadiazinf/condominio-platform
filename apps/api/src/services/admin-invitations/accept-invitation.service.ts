import type {
  TAdminInvitation,
  TUser,
  TUserRole,
  TManagementCompany,
  TManagementCompanyMember,
} from '@packages/domain'
import type {
  AdminInvitationsRepository,
  UsersRepository,
  ManagementCompaniesRepository,
  ManagementCompanyMembersRepository,
  UserRolesRepository,
  RolesRepository,
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
  userRole: TUserRole
}

/**
 * Service for accepting an invitation.
 * Updates the user with Firebase UID, activates user and company,
 * creates member with primary admin role, and marks the invitation as accepted.
 */
export class AcceptInvitationService {
  constructor(
    private readonly db: TDrizzleClient,
    private readonly invitationsRepository: AdminInvitationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly managementCompaniesRepository: ManagementCompaniesRepository,
    private readonly membersRepository: ManagementCompanyMembersRepository,
    private readonly userRolesRepository: UserRolesRepository,
    private readonly rolesRepository: RolesRepository
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

    // Get user (include inactive — invitation users are inactive until accepted)
    const user = await this.usersRepository.getById(invitation.userId, true)
    if (!user) {
      return failure('User not found', 'NOT_FOUND')
    }

    // Get management company (include inactive — company is inactive until invitation accepted)
    const managementCompany = await this.managementCompaniesRepository.getById(
      invitation.managementCompanyId, true
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

    // Look up roles before starting the transaction (read-only, avoids
    // acquiring a second connection inside the tx which can deadlock in test containers)
    const userRole = await this.rolesRepository.getByName('USER')
    if (!userRole) {
      return failure('USER role not found in system', 'INTERNAL_ERROR')
    }

    const adminRole = await this.rolesRepository.getByName('ADMIN')
    if (!adminRole) {
      return failure('ADMIN role not found in system', 'INTERNAL_ERROR')
    }

    // All writes inside a transaction for atomicity
    return await this.db.transaction(async (tx) => {
      const txUsersRepo = this.usersRepository.withTx(tx)
      const txCompaniesRepo = this.managementCompaniesRepository.withTx(tx)
      const txInvitationsRepo = this.invitationsRepository.withTx(tx)
      const txMembersRepo = this.membersRepository.withTx(tx)
      const txUserRolesRepo = this.userRolesRepository.withTx(tx)

      // Update user: set Firebase UID, activate, and verify email
      const updatedUser = await txUsersRepo.update(user.id, {
        firebaseUid: input.firebaseUid,
        isActive: true,
        isEmailVerified: true,
      })

      if (!updatedUser) {
        return failure('Failed to update user', 'INTERNAL_ERROR')
      }

      // Activate management company
      const updatedCompany = await txCompaniesRepo.update(
        managementCompany.id,
        { isActive: true }
      )

      if (!updatedCompany) {
        return failure('Failed to update management company', 'INTERNAL_ERROR')
      }

      // Mark invitation as accepted
      const acceptedInvitation = await txInvitationsRepo.markAsAccepted(
        invitation.id
      )

      if (!acceptedInvitation) {
        return failure('Failed to accept invitation', 'INTERNAL_ERROR')
      }

      // Activate or create MC-scoped ADMIN role in user_roles (unified role system)
      // The role may already exist (inactive) if created during company setup
      const existingMcRoles = await txUserRolesRepo.getByUserAndManagementCompany(
        updatedUser.id,
        managementCompany.id
      )
      const existingMcAdminRole = existingMcRoles.find(r => r.roleId === adminRole.id)

      let mcRoleAssignment: TUserRole
      if (existingMcAdminRole) {
        const activated = await txUserRolesRepo.update(existingMcAdminRole.id, { isActive: true })
        mcRoleAssignment = activated ?? existingMcAdminRole
      } else {
        mcRoleAssignment = await txUserRolesRepo.createManagementCompanyRole(
          updatedUser.id,
          adminRole.id,
          managementCompany.id,
          invitation.createdBy
        )
      }

      // Activate existing member (created during company setup with isActive=false)
      const existingMember = await txMembersRepo.getByCompanyAndUser(
        managementCompany.id,
        updatedUser.id
      )

      let member: TManagementCompanyMember
      if (existingMember) {
        const activated = await txMembersRepo.update(existingMember.id, {
          isActive: true,
          joinedAt: new Date(),
          userRoleId: mcRoleAssignment.id,
        })
        if (!activated) {
          return failure('Failed to activate member', 'INTERNAL_ERROR')
        }
        member = activated
      } else {
        // Fallback: create member if it wasn't created during company setup
        const created = await txMembersRepo.create({
          managementCompanyId: managementCompany.id,
          userId: updatedUser.id,
          roleName: 'admin',
          userRoleId: mcRoleAssignment.id,
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
        if (!created) {
          return failure('Failed to create member', 'INTERNAL_ERROR')
        }
        member = created
      }

      // Assign USER role in user_roles table (system-level access)
      const userRoleAssignment = await txUserRolesRepo.create({
        userId: updatedUser.id,
        roleId: userRole.id,
        condominiumId: null,
        buildingId: null,
        managementCompanyId: null,
        isActive: true,
        notes: 'Assigned via admin invitation acceptance',
        assignedBy: invitation.createdBy,
        registeredBy: invitation.createdBy,
        expiresAt: null,
      })

      if (!userRoleAssignment) {
        return failure('Failed to assign user role', 'INTERNAL_ERROR')
      }

      return success({
        invitation: acceptedInvitation,
        user: updatedUser,
        managementCompany: updatedCompany,
        member,
        userRole: userRoleAssignment,
      })
    })
  }
}
