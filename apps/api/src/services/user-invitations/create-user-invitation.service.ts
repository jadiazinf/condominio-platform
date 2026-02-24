import type { TUserInvitation, TUser, TUserCreate, TUserRole, TUserRoleCreate } from '@packages/domain'
import type {
  UserInvitationsRepository,
  UsersRepository,
  UserRolesRepository,
  RolesRepository,
  CondominiumsRepository,
} from '@database/repositories'
import { type TServiceResult, success, failure } from '../base.service'
import { generateSecureToken, hashToken, calculateExpirationDate } from '../../utils/token'

export interface ICreateUserInvitationInput {
  email: string
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
  phoneCountryCode?: string | null
  phoneNumber?: string | null
  idDocumentType?: 'J' | 'G' | 'V' | 'E' | 'P' | null
  idDocumentNumber?: string | null
  condominiumId?: string | null // Null for global users (superadmins)
  roleId: string
  createdBy: string // Admin/superadmin user ID
  expirationDays?: number
}

export interface ICreateUserInvitationResult {
  user: TUser
  invitation: TUserInvitation
  userRole: TUserRole
  invitationToken: string // Plain text token to send via email
}

/**
 * Service for creating a new user with an invitation.
 *
 * This orchestrates the complete flow:
 * 1. Validates the role and condominium exist
 * 2. Creates the user with isActive=false (pending confirmation)
 * 3. Creates the user-role assignment
 * 4. Creates an invitation with a secure token
 * 5. Returns the token to be sent via email
 *
 * When the user confirms via the email link, the AcceptUserInvitationService
 * will activate the user.
 */
export class CreateUserInvitationService {
  constructor(
    private readonly invitationsRepository: UserInvitationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly userRolesRepository: UserRolesRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly condominiumsRepository: CondominiumsRepository
  ) {}

  async execute(
    input: ICreateUserInvitationInput
  ): Promise<TServiceResult<ICreateUserInvitationResult>> {
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

    // Check if email already exists
    const existingUser = await this.usersRepository.getByEmail(input.email)
    if (existingUser) {
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

      // If user exists and is active, we could add a role to them instead
      // For now, we'll return an error indicating they should use a different flow
      if (existingUser.isActive) {
        return failure(
          'User already exists. Use the "Assign Role" feature to add roles to existing users.',
          'CONFLICT'
        )
      }

      // User exists but is inactive (pending from another invitation)
      // Create another invitation for this user
      return this.createInvitationForExistingUser(existingUser, input, role.id)
    }

    // Generate a temporary Firebase UID (will be replaced when user accepts invitation)
    const tempFirebaseUid = `pending_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    // Create user with isActive=false
    const userData: TUserCreate = {
      email: input.email,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      displayName:
        input.displayName ?? (input.firstName && input.lastName ? `${input.firstName} ${input.lastName}` : null),
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

    // Create user-role assignment
    const userRoleData: TUserRoleCreate = {
      userId: user.id,
      roleId: role.id,
      condominiumId: input.condominiumId ?? null,
      buildingId: null,
      managementCompanyId: null,
      isActive: false, // Will be activated when invitation is accepted
      notes: 'Created via invitation',
      assignedBy: input.createdBy,
      registeredBy: input.createdBy,
      expiresAt: null,
    }

    const userRole = await this.userRolesRepository.create(userRoleData)

    // Generate invitation token
    const token = generateSecureToken()
    const tokenHash = hashToken(token)
    const expiresAt = calculateExpirationDate(input.expirationDays ?? 7)

    // Create invitation
    const invitation = await this.invitationsRepository.create({
      userId: user.id,
      condominiumId: input.condominiumId ?? null,
      roleId: role.id,
      token,
      tokenHash,
      status: 'pending',
      email: user.email,
      expiresAt,
      acceptedAt: null,
      emailError: null,
      createdBy: input.createdBy,
    })

    return success({
      user,
      invitation,
      userRole,
      invitationToken: token,
    })
  }

  private async createInvitationForExistingUser(
    existingUser: TUser,
    input: ICreateUserInvitationInput,
    roleId: string
  ): Promise<TServiceResult<ICreateUserInvitationResult>> {
    // Create user-role assignment for the existing user
    const userRoleData: TUserRoleCreate = {
      userId: existingUser.id,
      roleId: roleId,
      condominiumId: input.condominiumId ?? null,
      buildingId: null,
      managementCompanyId: null,
      isActive: false, // Will be activated when invitation is accepted
      notes: 'Created via invitation',
      assignedBy: input.createdBy,
      registeredBy: input.createdBy,
      expiresAt: null,
    }

    const userRole = await this.userRolesRepository.create(userRoleData)

    // Generate invitation token
    const token = generateSecureToken()
    const tokenHash = hashToken(token)
    const expiresAt = calculateExpirationDate(input.expirationDays ?? 7)

    // Create invitation
    const invitation = await this.invitationsRepository.create({
      userId: existingUser.id,
      condominiumId: input.condominiumId ?? null,
      roleId: roleId,
      token,
      tokenHash,
      status: 'pending',
      email: existingUser.email,
      expiresAt,
      acceptedAt: null,
      emailError: null,
      createdBy: input.createdBy,
    })

    return success({
      user: existingUser,
      invitation,
      userRole,
      invitationToken: token,
    })
  }
}
