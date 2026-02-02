import type {
  TUserInvitation,
  TUser,
  TUserCreate,
  TUserRole,
  TUserRoleCreate,
  TUserPermission,
  TUserPermissionCreate,
} from '@packages/domain'
import type {
  UserInvitationsRepository,
  UsersRepository,
  UserRolesRepository,
  UserPermissionsRepository,
  RolesRepository,
  CondominiumsRepository,
  PermissionsRepository,
} from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'
import { generateSecureToken, hashToken, calculateExpirationDate } from '../../utils/token'

/**
 * Input for creating a user invitation.
 * Supports three user types: general, condominium, and superadmin.
 */
export interface ICreateUserWithInvitationInput {
  // Basic user information
  email: string
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
  phoneCountryCode?: string | null
  phoneNumber?: string | null
  idDocumentType?: 'CI' | 'RIF' | 'Pasaporte' | null
  idDocumentNumber?: string | null

  // Role assignment
  roleId: string

  // Condominium assignment (required for condominium users, null for general/superadmin)
  condominiumId?: string | null

  // Custom permissions (optional for condominium users, required for superadmin)
  customPermissions?: string[] // Array of permission IDs to grant

  // Metadata
  createdBy: string // Superadmin user ID
  expirationDays?: number
}

export interface ICreateUserWithInvitationResult {
  user: TUser
  invitation: TUserInvitation
  userRole: TUserRole
  userPermissions: TUserPermission[]
  invitationToken: string
}

/**
 * Service for creating users with invitations.
 *
 * Supports three user creation flows:
 *
 * 1. **General User Flow**:
 *    - Assigns the USER role
 *    - No condominium assignment
 *    - No custom permissions
 *
 * 2. **Condominium User Flow**:
 *    - Assigns a specific role (e.g., ADMIN, RESIDENTE)
 *    - Requires condominium assignment
 *    - Optional custom permissions to override role defaults
 *
 * 3. **Superadmin Flow**:
 *    - Assigns direct permissions (no role, or SUPERADMIN role)
 *    - No condominium assignment
 *    - Custom permissions define access
 *
 * The service creates:
 * - User record (inactive until invitation accepted)
 * - User-role assignment
 * - Custom permission assignments (if provided)
 * - Invitation with secure token
 */
export class CreateUserWithInvitationService {
  constructor(
    private readonly invitationsRepository: UserInvitationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly userRolesRepository: UserRolesRepository,
    private readonly userPermissionsRepository: UserPermissionsRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly condominiumsRepository: CondominiumsRepository,
    private readonly permissionsRepository: PermissionsRepository
  ) {}

  async execute(
    input: ICreateUserWithInvitationInput
  ): Promise<TServiceResult<ICreateUserWithInvitationResult>> {
    // Step 1: Validate input
    const validationResult = await this.validateInput(input)
    if (!validationResult.success) {
      return validationResult as TServiceResult<ICreateUserWithInvitationResult>
    }

    // Step 2: Check if user already exists
    const existingUser = await this.usersRepository.getByEmail(input.email)
    if (existingUser) {
      return this.handleExistingUser(existingUser, input)
    }

    // Step 3: Create new user
    const userResult = await this.createUser(input)
    if (!userResult.success) {
      return userResult as TServiceResult<ICreateUserWithInvitationResult>
    }

    const user = userResult.data

    // Step 4: Create user-role assignment
    const userRoleResult = await this.createUserRole(user.id, input)
    if (!userRoleResult.success) {
      // Rollback: delete created user
      await this.usersRepository.delete(user.id)
      return userRoleResult as TServiceResult<ICreateUserWithInvitationResult>
    }

    const userRole = userRoleResult.data

    // Step 5: Create custom permissions (if provided)
    const permissionsResult = await this.createUserPermissions(user.id, input)
    if (!permissionsResult.success) {
      // Rollback: delete user and role
      await this.userRolesRepository.delete(userRole.id)
      await this.usersRepository.delete(user.id)
      return permissionsResult as TServiceResult<ICreateUserWithInvitationResult>
    }

    const userPermissions = permissionsResult.data

    // Step 6: Create invitation
    const invitationResult = await this.createInvitation(user, input)
    if (!invitationResult.success) {
      // Rollback: delete permissions, role, and user
      for (const perm of userPermissions) {
        await this.userPermissionsRepository.delete(perm.id)
      }
      await this.userRolesRepository.delete(userRole.id)
      await this.usersRepository.delete(user.id)
      return invitationResult as TServiceResult<ICreateUserWithInvitationResult>
    }

    const { invitation, token } = invitationResult.data

    return success({
      user,
      invitation,
      userRole,
      userPermissions,
      invitationToken: token,
    })
  }

  /**
   * Validates the input for creating a user invitation.
   */
  private async validateInput(
    input: ICreateUserWithInvitationInput
  ): Promise<TServiceResult<void>> {
    // Validate role exists
    const role = await this.rolesRepository.getById(input.roleId)
    if (!role) {
      return failure('Role not found', 'NOT_FOUND')
    }

    // Validate condominium exists (if provided)
    if (input.condominiumId) {
      const condominium = await this.condominiumsRepository.getById(input.condominiumId)
      if (!condominium) {
        return failure('Condominium not found', 'NOT_FOUND')
      }
    }

    // Validate custom permissions exist (if provided)
    if (input.customPermissions && input.customPermissions.length > 0) {
      for (const permissionId of input.customPermissions) {
        const permission = await this.permissionsRepository.getById(permissionId)
        if (!permission) {
          return failure(`Permission not found: ${permissionId}`, 'NOT_FOUND')
        }
      }
    }

    return success(undefined)
  }

  /**
   * Handles the case when a user with the given email already exists.
   */
  private async handleExistingUser(
    existingUser: TUser,
    input: ICreateUserWithInvitationInput
  ): Promise<TServiceResult<ICreateUserWithInvitationResult>> {
    // Check if user already has a pending invitation
    const hasPending = await this.invitationsRepository.hasPendingInvitation(
      existingUser.id,
      input.condominiumId ?? null
    )

    if (hasPending) {
      return failure(
        'A pending invitation already exists for this user and condominium',
        'CONFLICT'
      )
    }

    // If user is active, they should use a different flow
    if (existingUser.isActive) {
      return failure(
        'User already exists and is active. Use the "Assign Role" feature instead.',
        'CONFLICT'
      )
    }

    // User exists but is inactive - create another invitation
    return this.createInvitationForExistingUser(existingUser, input)
  }

  /**
   * Creates a new user with isActive=false.
   */
  private async createUser(
    input: ICreateUserWithInvitationInput
  ): Promise<TServiceResult<TUser>> {
    // Generate a temporary Firebase UID (will be replaced when user accepts invitation)
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
    return success(user)
  }

  /**
   * Creates a user-role assignment.
   */
  private async createUserRole(
    userId: string,
    input: ICreateUserWithInvitationInput
  ): Promise<TServiceResult<TUserRole>> {
    const userRoleData: TUserRoleCreate = {
      userId,
      roleId: input.roleId,
      condominiumId: input.condominiumId ?? null,
      buildingId: null,
      isActive: false, // Activated when invitation is accepted
      notes: 'Created via invitation by superadmin',
      assignedBy: input.createdBy,
      registeredBy: input.createdBy,
      expiresAt: null,
    }

    const userRole = await this.userRolesRepository.create(userRoleData)
    return success(userRole)
  }

  /**
   * Creates custom permission assignments for the user.
   */
  private async createUserPermissions(
    userId: string,
    input: ICreateUserWithInvitationInput
  ): Promise<TServiceResult<TUserPermission[]>> {
    const userPermissions: TUserPermission[] = []

    if (!input.customPermissions || input.customPermissions.length === 0) {
      return success(userPermissions)
    }

    for (const permissionId of input.customPermissions) {
      const userPermissionData: TUserPermissionCreate = {
        userId,
        permissionId,
        isEnabled: false, // Enabled when invitation is accepted
        assignedBy: input.createdBy,
      }

      const userPermission = await this.userPermissionsRepository.create(userPermissionData)
      userPermissions.push(userPermission)
    }

    return success(userPermissions)
  }

  /**
   * Creates an invitation with a secure token.
   */
  private async createInvitation(
    user: TUser,
    input: ICreateUserWithInvitationInput
  ): Promise<TServiceResult<{ invitation: TUserInvitation; token: string }>> {
    const token = generateSecureToken()
    const tokenHash = hashToken(token)
    const expiresAt = calculateExpirationDate(input.expirationDays ?? 7)

    const invitation = await this.invitationsRepository.create({
      userId: user.id,
      condominiumId: input.condominiumId ?? null,
      roleId: input.roleId,
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
   * Creates an invitation for an existing inactive user.
   */
  private async createInvitationForExistingUser(
    existingUser: TUser,
    input: ICreateUserWithInvitationInput
  ): Promise<TServiceResult<ICreateUserWithInvitationResult>> {
    // Create user-role assignment
    const userRoleResult = await this.createUserRole(existingUser.id, input)
    if (!userRoleResult.success) {
      return userRoleResult as TServiceResult<ICreateUserWithInvitationResult>
    }

    const userRole = userRoleResult.data

    // Create custom permissions
    const permissionsResult = await this.createUserPermissions(existingUser.id, input)
    if (!permissionsResult.success) {
      await this.userRolesRepository.delete(userRole.id)
      return permissionsResult as TServiceResult<ICreateUserWithInvitationResult>
    }

    const userPermissions = permissionsResult.data

    // Create invitation
    const invitationResult = await this.createInvitation(existingUser, input)
    if (!invitationResult.success) {
      for (const perm of userPermissions) {
        await this.userPermissionsRepository.delete(perm.id)
      }
      await this.userRolesRepository.delete(userRole.id)
      return invitationResult as TServiceResult<ICreateUserWithInvitationResult>
    }

    const { invitation, token } = invitationResult.data

    return success({
      user: existingUser,
      invitation,
      userRole,
      userPermissions,
      invitationToken: token,
    })
  }
}
