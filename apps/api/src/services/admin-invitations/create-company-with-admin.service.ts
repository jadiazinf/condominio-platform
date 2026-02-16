import type {
  TAdminInvitation,
  TUser,
  TUserCreate,
  TManagementCompany,
  TManagementCompanyCreate,
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
import { generateSecureToken, hashToken, calculateExpirationDate } from '../../utils/token'
import logger from '@utils/logger'

export interface ICreateCompanyWithAdminInput {
  company: Omit<TManagementCompanyCreate, 'createdBy' | 'isActive'>
  admin: Omit<TUserCreate, 'firebaseUid' | 'isActive' | 'isEmailVerified'>
  createdBy: string // Superadmin user ID
  expirationDays?: number
}

export interface ICreateCompanyWithAdminResult {
  company: TManagementCompany
  admin: TUser
  member: TManagementCompanyMember
  invitation: TAdminInvitation
  invitationToken: string // Plain text token to send via email
}

/**
 * Service for creating a management company with a new admin user.
 *
 * This orchestrates the complete flow:
 * 1. Creates the user with isActive=false (pending confirmation)
 * 2. Creates the management company with isActive=false
 * 3. Creates an invitation with a secure token
 * 4. Returns the token to be sent via email
 *
 * When the user confirms via the email link, the AcceptInvitationService
 * will activate both the user and the company.
 */
export class CreateCompanyWithAdminService {
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
    input: ICreateCompanyWithAdminInput
  ): Promise<TServiceResult<ICreateCompanyWithAdminResult>> {
    // Check if email already exists
    const existingUser = await this.usersRepository.getByEmail(input.admin.email)
    if (existingUser) {
      if (!existingUser.isActive) {
        return failure(
          'A pending user with this email already exists',
          'CONFLICT'
        )
      }
      return failure(
        'A user with this email already exists. Use the existing user option.',
        'CONFLICT'
      )
    }

    // Generate a temporary Firebase UID (will be replaced when user accepts invitation)
    const tempFirebaseUid = `pending_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    // Generate invitation token before transaction (pure computation)
    const token = generateSecureToken()
    const tokenHash = hashToken(token)
    const expiresAt = calculateExpirationDate(input.expirationDays ?? 7)

    // Look up ADMIN role before starting the transaction (read-only)
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

      // Create user with isActive=false
      const userData: TUserCreate = {
        ...input.admin,
        firebaseUid: tempFirebaseUid,
        isActive: false,
        isEmailVerified: false,
      }

      const admin = await txUsersRepo.create(userData)

      // Create management company with isActive=false
      const companyData: TManagementCompanyCreate = {
        ...input.company,
        createdBy: input.createdBy, // Use authenticated user (superadmin), not the admin
        isActive: false,
      }

      const company = await txCompaniesRepo.create(companyData)

      // Create invitation
      const invitation = await txInvitationsRepo.create({
        userId: admin.id,
        managementCompanyId: company.id,
        token,
        tokenHash,
        status: 'pending',
        email: admin.email,
        expiresAt,
        acceptedAt: null,
        emailError: null,
        createdBy: input.createdBy,
      })

      // Create MC-scoped ADMIN role (inactive — activated when invitation is accepted)
      const mcRoleAssignment = await txUserRolesRepo.createManagementCompanyRole(
        admin.id,
        adminRole.id,
        company.id,
        input.createdBy
      )
      // Mark as inactive until invitation is accepted
      await txUserRolesRepo.update(mcRoleAssignment.id, { isActive: false })

      // Create member with primary admin role (inactive until invitation is accepted)
      const member = await txMembersRepo.create({
        managementCompanyId: company.id,
        userId: admin.id,
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

      logger.info(
        {
          invitationId: invitation.id,
          userId: admin.id,
          companyId: company.id,
          memberId: member.id,
          email: admin.email,
          tokenLength: token.length,
          tokenPrefix: token.substring(0, 8),
          storedTokenPrefix: invitation.token.substring(0, 8),
          tokenMatch: token === invitation.token,
        },
        'Admin invitation created successfully with member role'
      )

      return success({
        company,
        admin,
        member,
        invitation,
        invitationToken: token,
      })
    })
  }
}
