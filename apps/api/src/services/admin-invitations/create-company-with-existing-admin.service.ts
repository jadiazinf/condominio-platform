import {
  type TAdminInvitation,
  type TUser,
  type TManagementCompany,
  type TManagementCompanyCreate,
  type TManagementCompanyMember,
  ESystemRole,
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
import { generateSecureToken, hashToken, calculateExpirationDate } from '../../utils/token'
import logger from '@utils/logger'

export interface ICreateCompanyWithExistingAdminInput {
  company: Omit<TManagementCompanyCreate, 'createdBy' | 'isActive'>
  existingUserId: string
  createdBy: string // Superadmin user ID
  expirationDays?: number
}

export interface ICreateCompanyWithExistingAdminResult {
  company: TManagementCompany
  admin: TUser
  member: TManagementCompanyMember
  invitation: TAdminInvitation
  invitationToken: string // Plain text token to send via email
}

/**
 * Service for creating a management company with an existing user as admin.
 *
 * Like CreateCompanyWithAdminService, this service requires the admin to confirm
 * via an invitation email before the company becomes active.
 *
 * Flow:
 * 1. Validates the existing user is active
 * 2. Creates the management company with isActive=false (pending confirmation)
 * 3. Creates an invitation with a secure token
 * 4. Creates the member and role as inactive (pending confirmation)
 * 5. Returns the token to be sent via email
 *
 * When the user confirms via the email link, the AcceptInvitationService
 * will activate the company, member, and role.
 */
export class CreateCompanyWithExistingAdminService {
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
    input: ICreateCompanyWithExistingAdminInput
  ): Promise<TServiceResult<ICreateCompanyWithExistingAdminResult>> {
    // Validate user exists and is active
    const user = await this.usersRepository.getById(input.existingUserId)

    if (!user) {
      return failure('User not found', 'NOT_FOUND')
    }

    if (!user.isActive) {
      return failure('User is not active', 'BAD_REQUEST')
    }

    // Check if a management company with this email already exists
    if (input.company.email) {
      const existingCompany = await this.managementCompaniesRepository.getByEmail(
        input.company.email
      )
      if (existingCompany) {
        return failure('A management company with this email already exists', 'CONFLICT')
      }
    }

    // Generate invitation token before transaction (pure computation)
    const token = generateSecureToken()
    const tokenHash = hashToken(token)
    const expiresAt = calculateExpirationDate(input.expirationDays ?? 7)

    // Look up ADMIN role before starting the transaction (read-only, avoids
    // acquiring a second connection inside the tx which can deadlock in test containers)
    const adminRole = await this.rolesRepository.getByName(ESystemRole.ADMIN)
    if (!adminRole) {
      return failure('ADMIN role not found in system', 'INTERNAL_ERROR')
    }

    // All writes inside a transaction for atomicity
    return await this.db.transaction(async tx => {
      const txCompaniesRepo = this.managementCompaniesRepository.withTx(tx)
      const txInvitationsRepo = this.invitationsRepository.withTx(tx)
      const txMembersRepo = this.membersRepository.withTx(tx)
      const txUserRolesRepo = this.userRolesRepository.withTx(tx)

      // Create management company with isActive=false (pending confirmation)
      const companyData: TManagementCompanyCreate = {
        ...input.company,
        createdBy: input.createdBy,
        isActive: false,
      }

      const company = await txCompaniesRepo.create(companyData)

      if (!company) {
        return failure('Failed to create management company', 'INTERNAL_ERROR')
      }

      // Create invitation
      const invitation = await txInvitationsRepo.create({
        userId: user.id,
        managementCompanyId: company.id,
        token,
        tokenHash,
        status: 'pending',
        email: user.email,
        expiresAt,
        acceptedAt: null,
        emailError: null,
        createdBy: input.createdBy,
      })

      // Create MC-scoped ADMIN role (inactive — activated when invitation is accepted)
      const mcRoleAssignment = await txUserRolesRepo.createManagementCompanyRole(
        user.id,
        adminRole.id,
        company.id,
        input.createdBy
      )
      // Mark as inactive until invitation is accepted
      await txUserRolesRepo.update(mcRoleAssignment.id, { isActive: false })

      // Create member with primary admin role (inactive until invitation is accepted)
      const member = await txMembersRepo.create({
        managementCompanyId: company.id,
        userId: user.id,
        roleName: 'admin',
        userRoleId: mcRoleAssignment.id,
        permissions: {
          can_change_subscription: true,
          can_manage_members: true,
          can_create_tickets: true,
          can_view_invoices: true,
        },
        isPrimaryAdmin: true,
        joinedAt: null,
        invitedAt: new Date(),
        invitedBy: input.createdBy,
        isActive: false,
        deactivatedAt: null,
        deactivatedBy: null,
      })

      if (!member) {
        return failure('Failed to create member', 'INTERNAL_ERROR')
      }

      logger.info(
        {
          invitationId: invitation.id,
          userId: user.id,
          companyId: company.id,
          memberId: member.id,
          email: user.email,
          tokenPrefix: token.substring(0, 8),
        },
        'Admin invitation created for existing user'
      )

      return success({
        company,
        admin: user,
        member,
        invitation,
        invitationToken: token,
      })
    })
  }
}
