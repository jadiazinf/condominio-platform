import { eq } from 'drizzle-orm'
import type {
  TUnitOwnership,
  TUnitOwnershipCreate,
  TUserInvitation,
  TUser,
  TUserCreate,
  TUserRole,
  TOwnershipType,
} from '@packages/domain'
import type {
  UnitOwnershipsRepository,
  UsersRepository,
  UserRolesRepository,
  UserInvitationsRepository,
  RolesRepository,
  UnitsRepository,
  CondominiumsRepository,
} from '@database/repositories'
import { managementCompanies } from '@database/drizzle/schema'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'
import { generateSecureToken, hashToken, calculateExpirationDate } from '../../utils/token'
import { SendUserInvitationEmailService } from '../email'
import { LocaleDictionary } from '@locales/dictionary'
import { ESystemRole } from '@packages/domain'

const L = LocaleDictionary.http.controllers.unitOwnerships

export interface IAddUnitOwnerInput {
  unitId: string
  condominiumId: string
  mode: 'search' | 'register'
  ownershipType: TOwnershipType
  createdBy: string
  // Search mode (existing user):
  userId?: string
  // Register mode (new user):
  fullName?: string
  email?: string
  phone?: string
  phoneCountryCode?: string
  idDocumentType?: 'CI' | 'RIF' | 'Pasaporte' | null
  idDocumentNumber?: string
}

export interface IAddUnitOwnerResult {
  ownership: TUnitOwnership
  user: TUser
  invitation: TUserInvitation | null
  userRole: TUserRole | null
  invitationToken: string | null
}

export interface IResendInvitationResult {
  invitation: TUserInvitation
}


/**
 * Service for adding a unit owner/resident with optional invitation flow.
 *
 * Two modes:
 * 1. **Search mode**: Admin found an existing registered user by search.
 *    Creates ownership immediately. If user doesn't have a condominium role,
 *    creates an invitation for them to join.
 *
 * 2. **Register mode**: Admin registers a new unregistered user.
 *    Creates an inactive user, ownership, role, and sends invitation email
 *    for them to register and join the condominium.
 */
export class AddUnitOwnerService {
  private readonly sendEmailService: SendUserInvitationEmailService

  constructor(
    private readonly db: TDrizzleClient,
    private readonly unitOwnershipsRepository: UnitOwnershipsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly userRolesRepository: UserRolesRepository,
    private readonly userInvitationsRepository: UserInvitationsRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly unitsRepository: UnitsRepository,
    private readonly condominiumsRepository: CondominiumsRepository
  ) {
    this.sendEmailService = new SendUserInvitationEmailService()
  }

  async execute(input: IAddUnitOwnerInput): Promise<TServiceResult<IAddUnitOwnerResult>> {
    // Validate unit exists
    const unit = await this.unitsRepository.getById(input.unitId)
    if (!unit) {
      return failure(L.unitNotFound, 'NOT_FOUND')
    }

    // Get the USER role for condominium assignment
    const userRole = await this.rolesRepository.getByName(ESystemRole.USER)
    if (!userRole) {
      return failure(L.roleNotFound, 'INTERNAL_ERROR')
    }

    if (input.mode === 'search') {
      return this.handleSearchMode(input, userRole.id)
    }

    return this.handleRegisterMode(input, userRole.id)
  }

  /**
   * Resends an invitation for an existing ownership.
   * If no invitation exists (legacy data or created without email), creates a new one.
   */
  async resendInvitation(
    ownershipId: string,
    condominiumId: string,
    inviterId: string
  ): Promise<TServiceResult<IResendInvitationResult>> {
    const ownership = await this.unitOwnershipsRepository.getById(ownershipId)
    if (!ownership) {
      return failure(L.ownershipNotFound, 'NOT_FOUND')
    }

    if (!ownership.userId) {
      return failure(L.userIdRequired, 'BAD_REQUEST')
    }

    const user = await this.usersRepository.getById(ownership.userId, true)
    if (!user) {
      return failure(L.userNotFound, 'NOT_FOUND')
    }

    // Block if user already has an accepted invitation for this unit
    const acceptedInvitation =
      await this.userInvitationsRepository.getAcceptedByUserAndUnit(user.id, ownership.unitId)
    if (acceptedInvitation) {
      return failure(L.duplicateOwnership, 'CONFLICT')
    }

    // Look for any resendable invitation for this user+unit
    const existingInvitation =
      await this.userInvitationsRepository.getResendableByUserAndUnit(user.id, ownership.unitId)

    const newToken = generateSecureToken()
    const newTokenHash = hashToken(newToken)
    const newExpiresAt = calculateExpirationDate(7)

    if (existingInvitation) {
      // Regenerate token and renew expiration
      const updatedInvitation = await this.userInvitationsRepository.regenerateToken(
        existingInvitation.id,
        newToken,
        newTokenHash,
        newExpiresAt,
        condominiumId,
        ownership.unitId
      )

      // Send email (non-blocking)
      this.sendInvitationEmail(
        user,
        condominiumId,
        existingInvitation.roleId,
        newToken,
        newExpiresAt,
        inviterId,
        ownership.unitId
      )

      return success({
        invitation: updatedInvitation ?? existingInvitation,
      })
    }

    // No invitation exists — create a new one
    const userRole = await this.rolesRepository.getByName(ESystemRole.USER)
    if (!userRole) {
      return failure(L.roleNotFound, 'INTERNAL_ERROR')
    }

    const invitation = await this.userInvitationsRepository.create({
      userId: user.id,
      condominiumId,
      unitId: ownership.unitId,
      roleId: userRole.id,
      token: newToken,
      tokenHash: newTokenHash,
      status: 'pending',
      email: user.email,
      expiresAt: newExpiresAt,
      acceptedAt: null,
      emailError: null,
      createdBy: inviterId,
    })

    // Ensure user has a role for this condominium
    const existingRoles = await this.userRolesRepository.getByUserAndCondominium(
      user.id,
      condominiumId
    )
    if (!existingRoles.length) {
      await this.userRolesRepository.create({
        userId: user.id,
        roleId: userRole.id,
        condominiumId,
        buildingId: null,
        managementCompanyId: null,
        isActive: false,
        notes: 'Created via resend invitation',
        assignedBy: inviterId,
        registeredBy: inviterId,
        expiresAt: null,
      })
    }

    // Send email (non-blocking)
    this.sendInvitationEmail(user, condominiumId, userRole.id, newToken, newExpiresAt, inviterId, ownership.unitId)

    return success({ invitation })
  }

  /**
   * Handles adding an existing registered user as unit owner.
   */
  private async handleSearchMode(
    input: IAddUnitOwnerInput,
    roleId: string
  ): Promise<TServiceResult<IAddUnitOwnerResult>> {
    if (!input.userId) {
      return failure(L.userIdRequired, 'BAD_REQUEST')
    }

    // Validate user exists (include inactive users)
    const user = await this.usersRepository.getById(input.userId, true)
    if (!user) {
      return failure(L.userNotFound, 'NOT_FOUND')
    }

    // Check for duplicate ownership (same user + unit)
    const existingOwnership = await this.unitOwnershipsRepository.getByUnitAndUser(
      input.unitId,
      user.id
    )
    if (existingOwnership && existingOwnership.isActive) {
      // Self-heal: if ownership exists but isRegistered is false and user has active role, fix it
      if (!existingOwnership.isRegistered) {
        const roles = await this.userRolesRepository.getByUserAndCondominium(user.id, input.condominiumId)
        if (roles.some(r => r.isActive)) {
          await this.unitOwnershipsRepository.update(existingOwnership.id, { isRegistered: true })
          return success({
            ownership: { ...existingOwnership, isRegistered: true },
            user,
            invitation: null,
            userRole: null,
            invitationToken: null,
          })
        }
      }

      // Duplicate ownership: try to resend existing invitation instead of failing
      const resendResult = await this.handleResendInvitation(
        user,
        input.condominiumId,
        existingOwnership,
        input.createdBy
      )
      if (resendResult) return resendResult
      return failure(L.duplicateOwnership, 'CONFLICT')
    }

    // Check if user already has a role in this condominium
    const existingRoles = await this.userRolesRepository.getByUserAndCondominium(
      user.id,
      input.condominiumId
    )
    const hasActiveRole = existingRoles.some(r => r.isActive)
    const existingInactiveRole = existingRoles.find(r => !r.isActive)

    // All writes in transaction
    return await this.db.transaction(async tx => {
      const txOwnershipsRepo = this.unitOwnershipsRepository.withTx(tx)
      const txUserRolesRepo = this.userRolesRepository.withTx(tx)
      const txInvitationsRepo = this.userInvitationsRepository.withTx(tx)

      // Create ownership
      const ownershipData: TUnitOwnershipCreate = {
        unitId: input.unitId,
        userId: user.id,
        fullName:
          user.displayName || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || null,
        email: user.email,
        phone: user.phoneNumber,
        phoneCountryCode: user.phoneCountryCode,
        idDocumentType: user.idDocumentType ?? null,
        idDocumentNumber: user.idDocumentNumber ?? null,
        isRegistered: hasActiveRole,
        ownershipType: input.ownershipType,
        ownershipPercentage: null,
        titleDeedNumber: null,
        titleDeedDate: null,
        startDate: new Date().toISOString().split('T')[0]!,
        endDate: null,
        isActive: true,
        isPrimaryResidence: false,
        metadata: null,
      }

      const ownership = await txOwnershipsRepo.create(ownershipData)

      // If user already has a role, no invitation needed
      if (hasActiveRole) {
        return success({
          ownership,
          user,
          invitation: null,
          userRole: null,
          invitationToken: null,
        })
      }

      // Reuse existing inactive role or create new one
      const userRoleForResult =
        existingInactiveRole ??
        (await txUserRolesRepo.create({
          userId: user.id,
          roleId,
          condominiumId: input.condominiumId,
          buildingId: null,
          managementCompanyId: null,
          isActive: false,
          notes: 'Created via unit owner invitation',
          assignedBy: input.createdBy,
          registeredBy: input.createdBy,
          expiresAt: null,
        }))

      // Generate invitation
      const token = generateSecureToken()
      const tokenHash = hashToken(token)
      const expiresAt = calculateExpirationDate(7)

      const invitation = await txInvitationsRepo.create({
        userId: user.id,
        condominiumId: input.condominiumId,
        unitId: input.unitId,
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

      // Send email (outside transaction, non-blocking)
      this.sendInvitationEmail(user, input.condominiumId, roleId, token, expiresAt, input.createdBy, input.unitId)

      return success({
        ownership,
        user,
        invitation,
        userRole: userRoleForResult,
        invitationToken: token,
      })
    })
  }

  /**
   * Handles registering a new user and adding them as unit owner.
   */
  private async handleRegisterMode(
    input: IAddUnitOwnerInput,
    roleId: string
  ): Promise<TServiceResult<IAddUnitOwnerResult>> {
    if (!input.fullName) {
      return failure(L.fullNameRequired, 'BAD_REQUEST')
    }

    if (!input.idDocumentType || !input.idDocumentNumber) {
      return failure(L.documentRequired, 'BAD_REQUEST')
    }

    const hasEmail = !!input.email

    // Check if email already belongs to an active user (only if email provided)
    let existingUser: TUser | null = null
    if (hasEmail) {
      existingUser = (await this.usersRepository.getByEmail(input.email!)) ?? null

      if (existingUser?.isActive) {
        return failure(L.emailAlreadyRegistered, 'CONFLICT')
      }
    }

    // Also check by document number
    if (!existingUser) {
      existingUser =
        (await this.usersRepository.getByEmailOrDocument(input.idDocumentNumber!)) ?? null
      if (existingUser?.isActive) {
        return failure(L.documentAlreadyRegistered, 'CONFLICT')
      }
    }

    // All writes in transaction
    return await this.db.transaction(async tx => {
      const txUsersRepo = this.usersRepository.withTx(tx)
      const txOwnershipsRepo = this.unitOwnershipsRepository.withTx(tx)
      const txUserRolesRepo = this.userRolesRepository.withTx(tx)
      const txInvitationsRepo = this.userInvitationsRepository.withTx(tx)

      let user: TUser

      if (existingUser) {
        // Reuse existing inactive user
        user = existingUser
      } else {
        // Parse fullName into firstName and lastName
        const nameParts = input.fullName!.trim().split(/\s+/)
        const firstName = nameParts[0] ?? null
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null

        // Create new inactive user
        const tempFirebaseUid = `pending_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
        // Use email if provided, otherwise generate a placeholder
        const userEmail = input.email || `pending_${input.idDocumentNumber}@placeholder.local`

        const userData: TUserCreate = {
          email: userEmail,
          firstName,
          lastName,
          displayName: input.fullName!,
          phoneCountryCode: input.phoneCountryCode ?? null,
          phoneNumber: input.phone ?? null,
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

        user = await txUsersRepo.create(userData)
      }

      // Check for duplicate ownership
      const existingOwnership = await txOwnershipsRepo.getByUnitAndUser(input.unitId, user.id)
      if (existingOwnership && existingOwnership.isActive) {
        // Duplicate ownership: try to resend existing invitation instead of failing
        const resendResult = await this.handleResendInvitation(
          user,
          input.condominiumId,
          existingOwnership,
          input.createdBy
        )
        if (resendResult) return resendResult
        return failure(L.duplicateOwnership, 'CONFLICT')
      }

      // Check if user already has a role in this condominium (avoid duplicating inactive roles)
      const existingRoles = await this.userRolesRepository.getByUserAndCondominium(
        user.id,
        input.condominiumId
      )
      const existingInactiveRole = existingRoles.find(r => !r.isActive)

      // Create ownership
      const ownershipData: TUnitOwnershipCreate = {
        unitId: input.unitId,
        userId: user.id,
        fullName: input.fullName!,
        email: input.email ?? null,
        phone: input.phone ?? null,
        phoneCountryCode: input.phoneCountryCode ?? null,
        idDocumentType: input.idDocumentType ?? null,
        idDocumentNumber: input.idDocumentNumber ?? null,
        isRegistered: false,
        ownershipType: input.ownershipType,
        ownershipPercentage: null,
        titleDeedNumber: null,
        titleDeedDate: null,
        startDate: new Date().toISOString().split('T')[0]!,
        endDate: null,
        isActive: true,
        isPrimaryResidence: false,
        metadata: null,
      }

      const ownership = await txOwnershipsRepo.create(ownershipData)

      // Reuse existing inactive role or create new one
      const userRoleForResult =
        existingInactiveRole ??
        (await txUserRolesRepo.create({
          userId: user.id,
          roleId,
          condominiumId: input.condominiumId,
          buildingId: null,
          managementCompanyId: null,
          isActive: false,
          notes: 'Created via unit owner registration',
          assignedBy: input.createdBy,
          registeredBy: input.createdBy,
          expiresAt: null,
        }))

      // Only create invitation and send email if email was provided
      if (hasEmail) {
        const token = generateSecureToken()
        const tokenHash = hashToken(token)
        const expiresAt = calculateExpirationDate(7)

        const invitation = await txInvitationsRepo.create({
          userId: user.id,
          condominiumId: input.condominiumId,
          unitId: input.unitId,
          roleId,
          token,
          tokenHash,
          status: 'pending',
          email: input.email!,
          expiresAt,
          acceptedAt: null,
          emailError: null,
          createdBy: input.createdBy,
        })

        // Send email (outside transaction, non-blocking)
        this.sendInvitationEmail(
          user,
          input.condominiumId,
          roleId,
          token,
          expiresAt,
          input.createdBy,
          input.unitId
        )

        return success({
          ownership,
          user,
          invitation,
          userRole: userRoleForResult,
          invitationToken: token,
        })
      }

      // No email: create ownership and role only, no invitation
      return success({
        ownership,
        user,
        invitation: null,
        userRole: userRoleForResult,
        invitationToken: null,
      })
    })
  }

  /**
   * Handles resending an existing invitation when a duplicate ownership is detected.
   * Finds the pending invitation, regenerates the token and expiration, and resends the email.
   * Returns null if no pending invitation exists (caller should return CONFLICT).
   */
  private async handleResendInvitation(
    user: TUser,
    condominiumId: string,
    existingOwnership: TUnitOwnership,
    inviterId: string
  ): Promise<TServiceResult<IAddUnitOwnerResult> | null> {
    const pendingInvitation =
      await this.userInvitationsRepository.getResendableByUserAndUnit(user.id, existingOwnership.unitId)

    if (!pendingInvitation) {
      return null
    }

    // Regenerate token and renew expiration
    const newToken = generateSecureToken()
    const newTokenHash = hashToken(newToken)
    const newExpiresAt = calculateExpirationDate(7)

    const updatedInvitation = await this.userInvitationsRepository.regenerateToken(
      pendingInvitation.id,
      newToken,
      newTokenHash,
      newExpiresAt,
      condominiumId,
      existingOwnership.unitId
    )

    // Resend email (non-blocking)
    this.sendInvitationEmail(
      user,
      condominiumId,
      pendingInvitation.roleId,
      newToken,
      newExpiresAt,
      inviterId,
      existingOwnership.unitId
    )

    return success({
      ownership: existingOwnership,
      user,
      invitation: updatedInvitation ?? pendingInvitation,
      userRole: null,
      invitationToken: newToken,
    })
  }

  /**
   * Sends the invitation email asynchronously (fire-and-forget).
   * Fetches condominium, unit, management company, and inviter info for the email.
   */
  private sendInvitationEmail(
    user: TUser,
    condominiumId: string,
    _roleId: string,
    token: string,
    expiresAt: Date,
    inviterId: string,
    unitId?: string
  ): void {
    const recipientName = user.displayName || user.firstName || user.email

    // Fetch context data async, then send email
    this.fetchEmailContext(condominiumId, inviterId, unitId)
      .then(ctx => {
        return this.sendEmailService.execute({
          to: user.email,
          recipientName,
          condominiumName: ctx.condominiumName,
          unitIdentifier: ctx.unitIdentifier,
          roleName: 'Propietario/Residente',
          invitationToken: token,
          expiresAt,
          inviterName: ctx.inviterName,
          inviterEmail: ctx.inviterEmail,
          managementCompanyName: ctx.managementCompanyName,
          managementCompanyContact: ctx.managementCompanyContact,
        })
      })
      .catch(err => {
        // Log error but don't fail the main operation
        console.error('Failed to send owner invitation email:', err)
      })
  }

  /**
   * Fetches context data for the invitation email (condominium, unit, management company, inviter).
   */
  private async fetchEmailContext(
    condominiumId: string,
    inviterId: string,
    unitId?: string
  ): Promise<{
    condominiumName: string | null
    unitIdentifier: string | null
    inviterName: string | undefined
    inviterEmail: string | undefined
    managementCompanyName: string | undefined
    managementCompanyContact: string | undefined
  }> {
    // Fetch condominium, inviter, and unit in parallel
    const [condominium, inviter, unit] = await Promise.all([
      this.condominiumsRepository.getById(condominiumId, true),
      this.usersRepository.getById(inviterId),
      unitId ? this.unitsRepository.getById(unitId) : Promise.resolve(null),
    ])
    let mgmtCompanyName: string | undefined
    let mgmtCompanyContact: string | undefined

    // Get first management company from condominium's managementCompanyIds
    if (condominium?.managementCompanyIds?.length) {
      const mgmtId = condominium.managementCompanyIds[0]!
      const result = await this.db
        .select({
          name: managementCompanies.name,
          email: managementCompanies.email,
          phone: managementCompanies.phone,
        })
        .from(managementCompanies)
        .where(eq(managementCompanies.id, mgmtId))
        .limit(1)

      if (result[0]) {
        mgmtCompanyName = result[0].name
        mgmtCompanyContact = result[0].email || result[0].phone || undefined
      }
    }

    return {
      condominiumName: condominium?.name ?? null,
      unitIdentifier: unit?.unitNumber ?? null,
      inviterName:
        inviter?.displayName ||
        (inviter?.firstName ? `${inviter.firstName} ${inviter.lastName || ''}`.trim() : undefined),
      inviterEmail: inviter?.email,
      managementCompanyName: mgmtCompanyName,
      managementCompanyContact: mgmtCompanyContact,
    }
  }
}
