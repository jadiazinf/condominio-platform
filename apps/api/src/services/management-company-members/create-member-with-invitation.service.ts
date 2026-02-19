import {
  type TManagementCompanyMember,
  type TMemberRole,
  type TMemberPermissions,
  type TUser,
  type TUserInvitation,
  type TUserRole,
  type TUserCreate,
  type TUserRoleCreate,
  type TSystemRole,
  ESystemRole,
} from '@packages/domain'
import type {
  ManagementCompanyMembersRepository,
  ManagementCompaniesRepository,
  UserInvitationsRepository,
  UsersRepository,
  UserRolesRepository,
  RolesRepository,
} from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'
import { generateSecureToken, hashToken, calculateExpirationDate } from '../../utils/token'
import { SendUserInvitationEmailService } from '../email/send-user-invitation-email.service'
import { SendManagementCompanyMemberNotificationService } from '../email/send-management-company-member-notification.service'

/**
 * Maps a TMemberRole to the unified role name in the roles table.
 */
const MEMBER_ROLE_TO_SYSTEM_ROLE: Record<TMemberRole, TSystemRole> = {
  admin: ESystemRole.ADMIN,
  accountant: ESystemRole.ACCOUNTANT,
  support: ESystemRole.SUPPORT,
  viewer: ESystemRole.VIEWER,
}

/**
 * Input for creating a management company member with invitation
 */
export interface ICreateMemberWithInvitationInput {
  // Management company info
  managementCompanyId: string

  // User info (for creating new user or finding existing)
  email: string
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
  phoneCountryCode?: string | null
  phoneNumber?: string | null
  idDocumentType?: 'CI' | 'RIF' | 'Pasaporte' | null
  idDocumentNumber?: string | null

  // Member configuration
  memberRole: TMemberRole
  memberPermissions?: TMemberPermissions
  isPrimaryAdmin?: boolean

  // Metadata
  createdBy: string
  expirationDays?: number
}

export interface ICreateMemberWithInvitationResult {
  user: TUser
  invitation: TUserInvitation
  userRole: TUserRole
  member: TManagementCompanyMember
  invitationToken: string
  userEmailSent: boolean
  companyEmailSent: boolean
}

/**
 * Service for creating a management company member with invitation.
 *
 * This service handles the complete flow:
 * 1. Creates a new user or uses an existing one
 * 2. Creates a user role assignment
 * 3. Creates a user invitation
 * 4. Adds the user as a member to the management company
 * 5. Sends invitation email to the user
 * 6. Sends notification email to the management company
 *
 * All operations are performed atomically with rollback on failure.
 */
export class CreateMemberWithInvitationService {
  private readonly sendUserInvitationEmail: SendUserInvitationEmailService
  private readonly sendCompanyNotification: SendManagementCompanyMemberNotificationService

  constructor(
    private readonly membersRepository: ManagementCompanyMembersRepository,
    private readonly companiesRepository: ManagementCompaniesRepository,
    private readonly invitationsRepository: UserInvitationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly userRolesRepository: UserRolesRepository,
    private readonly rolesRepository: RolesRepository
  ) {
    this.sendUserInvitationEmail = new SendUserInvitationEmailService()
    this.sendCompanyNotification = new SendManagementCompanyMemberNotificationService()
  }

  async execute(
    input: ICreateMemberWithInvitationInput
  ): Promise<TServiceResult<ICreateMemberWithInvitationResult>> {
    // Step 1: Validate input
    const validationResult = await this.validateInput(input)
    if (!validationResult.success) {
      return validationResult as TServiceResult<ICreateMemberWithInvitationResult>
    }

    const { company, role } = validationResult.data

    // Step 2: Check or create user
    const userResult = await this.getOrCreateUser(input)
    if (!userResult.success) {
      return userResult as TServiceResult<ICreateMemberWithInvitationResult>
    }

    const { user, isNew } = userResult.data

    // Step 3: Check if user is already a member
    const existingMember = await this.membersRepository.getByCompanyAndUser(
      input.managementCompanyId,
      user.id
    )
    if (existingMember) {
      return failure('User is already a member of this management company', 'CONFLICT')
    }

    // Step 4: Create user role assignment
    const userRoleResult = await this.createUserRole(user.id, role.id, input)
    if (!userRoleResult.success) {
      // Rollback: delete user if it was newly created
      if (isNew) {
        await this.usersRepository.delete(user.id)
      }
      return userRoleResult as TServiceResult<ICreateMemberWithInvitationResult>
    }

    const userRole = userRoleResult.data

    // Step 5: Create invitation
    const invitationResult = await this.createInvitation(user, role.id, input)
    if (!invitationResult.success) {
      // Rollback: delete role and user
      await this.userRolesRepository.delete(userRole.id)
      if (isNew) {
        await this.usersRepository.delete(user.id)
      }
      return invitationResult as TServiceResult<ICreateMemberWithInvitationResult>
    }

    const { invitation, token } = invitationResult.data

    // Step 6: Add user as member to management company
    const memberResult = await this.addMember(user.id, input, userRole.id)
    if (!memberResult.success) {
      // Rollback: delete invitation, role, and user
      await this.invitationsRepository.markAsCancelled(invitation.id)
      await this.userRolesRepository.delete(userRole.id)
      if (isNew) {
        await this.usersRepository.delete(user.id)
      }
      return memberResult as TServiceResult<ICreateMemberWithInvitationResult>
    }

    const member = memberResult.data

    // Step 7: Send emails (non-blocking, don't fail if email fails)
    const userEmailSent = await this.sendUserEmail(user, company, role.name, token, invitation.expiresAt)
    const companyEmailSent = await this.sendCompanyEmail(company, user, input.memberRole)

    return success({
      user,
      invitation,
      userRole,
      member,
      invitationToken: token,
      userEmailSent,
      companyEmailSent,
    })
  }

  /**
   * Validates the input
   */
  private async validateInput(
    input: ICreateMemberWithInvitationInput
  ): Promise<TServiceResult<{ company: any; role: any }>> {
    // Validate management company exists
    const company = await this.companiesRepository.getById(input.managementCompanyId)
    if (!company) {
      return failure('Management company not found', 'NOT_FOUND')
    }

    // Get the system role matching the member role (ADMIN, ACCOUNTANT, SUPPORT, VIEWER)
    const systemRoleName = MEMBER_ROLE_TO_SYSTEM_ROLE[input.memberRole]
    const role = await this.rolesRepository.getByName(systemRoleName)
    if (!role) {
      return failure(`${systemRoleName} role not found in system`, 'NOT_FOUND')
    }

    // Check if primary admin already exists (if trying to add as primary)
    if (input.isPrimaryAdmin) {
      const existingPrimary = await this.membersRepository.getPrimaryAdmin(input.managementCompanyId)
      if (existingPrimary) {
        return failure('Management company already has a primary admin', 'CONFLICT')
      }
    }

    return success({ company, role })
  }

  /**
   * Gets an existing user or creates a new one
   */
  private async getOrCreateUser(
    input: ICreateMemberWithInvitationInput
  ): Promise<TServiceResult<{ user: TUser; isNew: boolean }>> {
    const existingUser = await this.usersRepository.getByEmail(input.email)

    if (existingUser) {
      // Check if user already has a pending invitation
      const hasPending = await this.invitationsRepository.hasPendingInvitation(existingUser.id, null)
      if (hasPending) {
        return failure(
          'User already has a pending invitation. Please wait for them to accept or cancel the existing invitation.',
          'CONFLICT'
        )
      }

      return success({ user: existingUser, isNew: false })
    }

    // Create new user
    const tempFirebaseUid = `pending_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    const userData: TUserCreate = {
      email: input.email,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      displayName:
        input.displayName ??
        (input.firstName && input.lastName ? `${input.firstName} ${input.lastName}` : null),
      phoneCountryCode: input.phoneCountryCode ?? null,
      phoneNumber: input.phoneNumber ?? null,
      idDocumentType: input.idDocumentType ?? null,
      idDocumentNumber: input.idDocumentNumber ?? null,
      firebaseUid: tempFirebaseUid,
      isActive: false,
      isEmailVerified: false,
      photoUrl: null,
      address: null,
      locationId: null,
      preferredLanguage: 'es',
      preferredCurrencyId: null,
      lastLogin: null,
      metadata: null,
    }

    const user = await this.usersRepository.create(userData)
    return success({ user, isNew: true })
  }

  /**
   * Creates an MC-scoped user-role assignment (unified role system)
   */
  private async createUserRole(
    userId: string,
    roleId: string,
    input: ICreateMemberWithInvitationInput
  ): Promise<TServiceResult<TUserRole>> {
    const userRoleData: TUserRoleCreate = {
      userId,
      roleId,
      condominiumId: null,
      buildingId: null,
      managementCompanyId: input.managementCompanyId,
      isActive: false, // Activated when invitation is accepted
      notes: 'Created via management company member invitation',
      assignedBy: input.createdBy,
      registeredBy: input.createdBy,
      expiresAt: null,
    }

    const userRole = await this.userRolesRepository.create(userRoleData)
    return success(userRole)
  }

  /**
   * Creates an invitation with a secure token
   */
  private async createInvitation(
    user: TUser,
    roleId: string,
    input: ICreateMemberWithInvitationInput
  ): Promise<TServiceResult<{ invitation: TUserInvitation; token: string }>> {
    const token = generateSecureToken()
    const tokenHash = hashToken(token)
    const expiresAt = calculateExpirationDate(input.expirationDays ?? 7)

    const invitation = await this.invitationsRepository.create({
      userId: user.id,
      condominiumId: null,
      roleId,
      token,
      tokenHash,
      status: 'pending',
      email: user.email,
      expiresAt,
      acceptedAt: null,
      emailError: null,
      createdBy: input.createdBy,
    })

    return success({ invitation, token })
  }

  /**
   * Adds user as member to management company
   */
  private async addMember(
    userId: string,
    input: ICreateMemberWithInvitationInput,
    userRoleId: string
  ): Promise<TServiceResult<TManagementCompanyMember>> {
    const permissions = input.memberPermissions ?? this.getDefaultPermissions(input.memberRole)

    const member = await this.membersRepository.addMember(
      input.managementCompanyId,
      userId,
      input.memberRole,
      input.isPrimaryAdmin ?? false,
      permissions,
      input.createdBy,
      userRoleId
    )

    return success(member)
  }

  /**
   * Gets default permissions for a role
   */
  private getDefaultPermissions(role: TMemberRole): TMemberPermissions {
    switch (role) {
      case 'admin':
        return {
          can_change_subscription: true,
          can_manage_members: true,
          can_create_tickets: true,
          can_view_invoices: true,
        }
      case 'accountant':
        return {
          can_change_subscription: true,
          can_manage_members: false,
          can_create_tickets: true,
          can_view_invoices: true,
        }
      case 'support':
        return {
          can_change_subscription: false,
          can_manage_members: false,
          can_create_tickets: true,
          can_view_invoices: false,
        }
      case 'viewer':
        return {
          can_change_subscription: false,
          can_manage_members: false,
          can_create_tickets: true,
          can_view_invoices: false,
        }
    }
  }

  /**
   * Sends invitation email to user
   */
  private async sendUserEmail(
    user: TUser,
    company: any,
    roleName: string,
    token: string,
    expiresAt: Date
  ): Promise<boolean> {
    try {
      const result = await this.sendUserInvitationEmail.execute({
        to: user.email,
        recipientName: user.displayName || user.firstName || user.email,
        condominiumName: null, // Not a condominium invitation
        roleName: `Miembro de ${company.name}`,
        invitationToken: token,
        expiresAt,
      })
      return result.success
    } catch (error) {
      return false
    }
  }

  /**
   * Sends notification email to management company
   */
  private async sendCompanyEmail(
    company: any,
    user: TUser,
    memberRole: TMemberRole
  ): Promise<boolean> {
    if (!company.email) {
      return false
    }

    try {
      const result = await this.sendCompanyNotification.execute({
        to: company.email,
        companyName: company.name,
        newMemberName: user.displayName || user.firstName || user.email,
        newMemberEmail: user.email,
        memberRole: this.getRoleLabel(memberRole),
      })
      return result.success
    } catch (error) {
      return false
    }
  }

  /**
   * Gets human-readable role label
   */
  private getRoleLabel(role: TMemberRole): string {
    const labels: Record<TMemberRole, string> = {
      admin: 'Administrador',
      accountant: 'Contador',
      support: 'Soporte',
      viewer: 'Visualizador',
    }
    return labels[role]
  }
}
