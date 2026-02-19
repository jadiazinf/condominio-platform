import {
  type TUser,
  type TUserRole,
  type TManagementCompany,
  type TManagementCompanyCreate,
  type TManagementCompanyMember,
  ESystemRole,
} from '@packages/domain'
import type {
  UsersRepository,
  ManagementCompaniesRepository,
  ManagementCompanyMembersRepository,
  UserRolesRepository,
  RolesRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'

export interface ICreateCompanyWithExistingAdminInput {
  company: Omit<TManagementCompanyCreate, 'createdBy' | 'isActive'>
  existingUserId: string
  createdBy: string // Superadmin user ID
}

export interface ICreateCompanyWithExistingAdminResult {
  company: TManagementCompany
  admin: TUser
  member: TManagementCompanyMember
  userRole: TUserRole
}

/**
 * Service for creating a management company with an existing user as admin.
 *
 * Unlike CreateCompanyWithAdminService (which creates a new user + invitation flow),
 * this service handles the case where the admin user already exists in the system.
 *
 * Flow:
 * 1. Validates the existing user is active
 * 2. Creates the management company (isActive=true, since admin is already confirmed)
 * 3. Creates the member with primary admin role and full permissions
 */
export class CreateCompanyWithExistingAdminService {
  constructor(
    private readonly db: TDrizzleClient,
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

    // Look up roles before starting the transaction (read-only, avoids
    // acquiring a second connection inside the tx which can deadlock in test containers)
    const userRole = await this.rolesRepository.getByName(ESystemRole.USER)
    if (!userRole) {
      return failure('USER role not found in system', 'INTERNAL_ERROR')
    }

    const adminRole = await this.rolesRepository.getByName(ESystemRole.ADMIN)
    if (!adminRole) {
      return failure('ADMIN role not found in system', 'INTERNAL_ERROR')
    }

    // All writes inside a transaction for atomicity
    return await this.db.transaction(async (tx) => {
      const txCompaniesRepo = this.managementCompaniesRepository.withTx(tx)
      const txMembersRepo = this.membersRepository.withTx(tx)
      const txUserRolesRepo = this.userRolesRepository.withTx(tx)

      // Create management company (active from the start since admin already exists)
      const companyData: TManagementCompanyCreate = {
        ...input.company,
        createdBy: input.createdBy,
        isActive: true,
      }

      const company = await txCompaniesRepo.create(companyData)

      if (!company) {
        return failure('Failed to create management company', 'INTERNAL_ERROR')
      }

      // Create MC-scoped ADMIN role in user_roles (unified role system)
      const mcRoleAssignment = await txUserRolesRepo.createManagementCompanyRole(
        user.id,
        adminRole.id,
        company.id,
        input.createdBy
      )

      // Create member with primary admin role, linked to unified user_role
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
        joinedAt: new Date(),
        invitedAt: new Date(),
        invitedBy: input.createdBy,
        isActive: true,
        deactivatedAt: null,
        deactivatedBy: null,
      })

      if (!member) {
        return failure('Failed to create member', 'INTERNAL_ERROR')
      }

      // Assign system-level USER role (no scope)
      const existingRoles = await txUserRolesRepo.getByUserAndRole(user.id, userRole.id, null)
      let userRoleAssignment: TUserRole

      if (existingRoles.length > 0) {
        userRoleAssignment = existingRoles[0]!
      } else {
        userRoleAssignment = await txUserRolesRepo.create({
          userId: user.id,
          roleId: userRole.id,
          condominiumId: null,
          buildingId: null,
          managementCompanyId: null,
          isActive: true,
          notes: 'Assigned via management company creation with existing admin',
          assignedBy: input.createdBy,
          registeredBy: input.createdBy,
          expiresAt: null,
        })
      }

      if (!userRoleAssignment) {
        return failure('Failed to assign user role', 'INTERNAL_ERROR')
      }

      return success({
        company,
        admin: user,
        member,
        userRole: userRoleAssignment,
      })
    })
  }
}
