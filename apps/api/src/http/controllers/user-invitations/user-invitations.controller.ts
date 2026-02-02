import type { Context } from 'hono'
import { z } from 'zod'
import { useTranslation } from '@intlify/hono'
import { admin } from '@libs/firebase/config'
import { EIdDocumentTypes } from '@packages/domain'
import type {
  UserInvitationsRepository,
  UsersRepository,
  UserRolesRepository,
  UserPermissionsRepository,
  RolesRepository,
  CondominiumsRepository,
  PermissionsRepository,
} from '@database/repositories'
import { HttpContext } from '../../context'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { createRouter } from '../create-router'
import type { TRouteDefinition } from '../types'
import { AppError } from '@errors/index'
import {
  CreateUserInvitationService,
  CreateUserWithInvitationService,
  ValidateUserInvitationTokenService,
  AcceptUserInvitationService,
} from '@src/services/user-invitations'
import { SendUserInvitationEmailService } from '@src/services/email'
import { LocaleDictionary } from '@locales/dictionary'
import logger from '@utils/logger'
import { isSuperadmin, SUPERADMIN_USER_PROP } from '@http/middlewares/utils/auth/is-superadmin'
import { authMiddleware } from '@http/middlewares/auth'

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const CreateUserInvitationSchema = z.object({
  email: z.string().email(),
  firstName: z.string().nullable().default(null),
  lastName: z.string().nullable().default(null),
  displayName: z.string().nullable().default(null),
  phoneCountryCode: z.string().nullable().default(null),
  phoneNumber: z.string().nullable().default(null),
  idDocumentType: z.enum(EIdDocumentTypes).nullable().default(null),
  idDocumentNumber: z.string().nullable().default(null),
  condominiumId: z.string().uuid().nullable().default(null),
  roleId: z.string().uuid(),
})

type TCreateUserInvitationBody = z.infer<typeof CreateUserInvitationSchema>

/**
 * Schema for the unified user creation endpoint (superadmin-only).
 * Supports general users, condominium users, and superadmin users with custom permissions.
 */
const CreateUserWithInvitationSchema = z.object({
  email: z.string().email(),
  firstName: z.string().nullable().default(null),
  lastName: z.string().nullable().default(null),
  displayName: z.string().nullable().default(null),
  phoneCountryCode: z.string().nullable().default(null),
  phoneNumber: z.string().nullable().default(null),
  idDocumentType: z.enum(EIdDocumentTypes).nullable().default(null),
  idDocumentNumber: z.string().nullable().default(null),
  condominiumId: z.string().uuid().nullable().default(null),
  roleId: z.string().uuid(),
  customPermissions: z.array(z.string().uuid()).optional().default([]),
  expirationDays: z.number().int().positive().optional().default(7),
})

type TCreateUserWithInvitationBody = z.infer<typeof CreateUserWithInvitationSchema>

const TokenParamSchema = z.object({
  token: z.string().min(1),
})

type TTokenParam = z.infer<typeof TokenParamSchema>

const IdParamSchema = z.object({
  id: z.string().uuid(),
})

type TIdParam = z.infer<typeof IdParamSchema>

/**
 * Controller for user invitation endpoints.
 *
 * Endpoints:
 * - POST   /                     Create a new user invitation (admin/superadmin only)
 * - POST   /create-user          Create user with invitation (superadmin-only, unified endpoint)
 * - POST   /:id/resend-email     Resend invitation email (admin/superadmin only)
 * - GET    /validate/:token      Validate invitation token (public)
 * - POST   /accept/:token        Accept invitation (public, requires Firebase token)
 * - DELETE /:id                  Cancel invitation (admin/superadmin only)
 */
export class UserInvitationsController {
  private readonly createUserInvitationService: CreateUserInvitationService
  private readonly createUserWithInvitationService: CreateUserWithInvitationService
  private readonly validateUserInvitationTokenService: ValidateUserInvitationTokenService
  private readonly acceptUserInvitationService: AcceptUserInvitationService
  private readonly sendUserInvitationEmailService: SendUserInvitationEmailService

  constructor(
    private readonly invitationsRepository: UserInvitationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly userRolesRepository: UserRolesRepository,
    private readonly userPermissionsRepository: UserPermissionsRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly condominiumsRepository: CondominiumsRepository,
    private readonly permissionsRepository: PermissionsRepository
  ) {
    this.createUserInvitationService = new CreateUserInvitationService(
      invitationsRepository,
      usersRepository,
      userRolesRepository,
      rolesRepository,
      condominiumsRepository
    )
    this.createUserWithInvitationService = new CreateUserWithInvitationService(
      invitationsRepository,
      usersRepository,
      userRolesRepository,
      userPermissionsRepository,
      rolesRepository,
      condominiumsRepository,
      permissionsRepository
    )
    this.validateUserInvitationTokenService = new ValidateUserInvitationTokenService(
      invitationsRepository,
      usersRepository,
      condominiumsRepository,
      rolesRepository
    )
    this.acceptUserInvitationService = new AcceptUserInvitationService(
      invitationsRepository,
      usersRepository,
      userRolesRepository
    )
    this.sendUserInvitationEmailService = new SendUserInvitationEmailService()
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'post',
        path: '/',
        handler: this.createInvitation,
        middlewares: [bodyValidator(CreateUserInvitationSchema)],
      },
      {
        method: 'post',
        path: '/create-user',
        handler: this.createUserWithInvitation,
        middlewares: [authMiddleware, isSuperadmin, bodyValidator(CreateUserWithInvitationSchema)],
      },
      {
        method: 'post',
        path: '/:id/resend-email',
        handler: this.resendEmail,
        middlewares: [paramsValidator(IdParamSchema)],
      },
      {
        method: 'get',
        path: '/validate/:token',
        handler: this.validateToken,
        middlewares: [paramsValidator(TokenParamSchema)],
      },
      {
        method: 'post',
        path: '/accept/:token',
        handler: this.acceptInvitation,
        middlewares: [paramsValidator(TokenParamSchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.cancelInvitation,
        middlewares: [paramsValidator(IdParamSchema)],
      },
    ]
  }

  createRouter() {
    return createRouter(this.routes)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a new user invitation.
   * This endpoint should be protected by admin/superadmin middleware.
   */
  private createInvitation = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<TCreateUserInvitationBody>(c)
    const t = useTranslation(c)

    // Get the creator user from auth context
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized(t(LocaleDictionary.http.middlewares.utils.auth.malformedHeader))
    }

    const token = authHeader.slice(7)

    let decodedToken: { uid: string }
    try {
      decodedToken = await admin.auth().verifyIdToken(token)
    } catch {
      throw AppError.invalidToken()
    }

    try {
      const creatorUser = await this.usersRepository.getByFirebaseUid(decodedToken.uid)

      if (!creatorUser) {
        throw AppError.unauthorized('User not found')
      }

      const result = await this.createUserInvitationService.execute({
        email: ctx.body.email,
        firstName: ctx.body.firstName,
        lastName: ctx.body.lastName,
        displayName: ctx.body.displayName,
        phoneCountryCode: ctx.body.phoneCountryCode,
        phoneNumber: ctx.body.phoneNumber,
        idDocumentType: ctx.body.idDocumentType,
        idDocumentNumber: ctx.body.idDocumentNumber,
        condominiumId: ctx.body.condominiumId,
        roleId: ctx.body.roleId,
        createdBy: creatorUser.id,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          throw AppError.notFound(result.error)
        }
        if (result.code === 'CONFLICT') {
          throw AppError.alreadyExists('User', 'email')
        }
        throw AppError.validation(result.error)
      }

      // Get the condominium and role names for the email
      let condominiumName: string | null = null
      if (ctx.body.condominiumId) {
        const condominium = await this.condominiumsRepository.getById(ctx.body.condominiumId)
        condominiumName = condominium?.name ?? null
      }

      const role = await this.rolesRepository.getById(ctx.body.roleId)
      const roleName = role?.name ?? 'Usuario'

      // Send invitation email
      const recipientName =
        result.data.user.displayName ||
        `${result.data.user.firstName || ''} ${result.data.user.lastName || ''}`.trim() ||
        result.data.user.email

      const emailResult = await this.sendUserInvitationEmailService.execute({
        to: result.data.user.email,
        recipientName,
        condominiumName,
        roleName,
        invitationToken: result.data.invitationToken,
        expiresAt: result.data.invitation.expiresAt,
      })

      if (!emailResult.success) {
        logger.error(
          {
            err: emailResult.error,
            invitationId: result.data.invitation.id,
            email: result.data.user.email,
          },
          'Failed to send user invitation email'
        )

        // Record the email error in the invitation
        await this.invitationsRepository.recordEmailError(
          result.data.invitation.id,
          emailResult.error
        )
      }

      return ctx.created({
        data: {
          user: result.data.user,
          invitation: result.data.invitation,
          userRole: result.data.userRole,
          emailSent: emailResult.success,
          // Include the token for development/testing purposes
          invitationToken: result.data.invitationToken,
        },
      })
    } catch (error) {
      logger.error(`Error creating user invitation: ${error}`)
      if (error instanceof AppError) {
        throw error
      }
      throw error
    }
  }

  /**
   * Create a user with invitation (unified endpoint).
   * Superadmin-only endpoint that handles all user creation flows:
   * - General users (with USER role)
   * - Condominium users (with specific role and optional custom permissions)
   * - Superadmin users (with custom permissions)
   */
  private createUserWithInvitation = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<TCreateUserWithInvitationBody>(c)
    const t = useTranslation(c)

    // Get the superadmin user from context (set by isSuperadmin middleware)
    const superadminUser = c.get(SUPERADMIN_USER_PROP)

    if (!superadminUser) {
      throw AppError.forbidden(t(LocaleDictionary.http.middlewares.utils.auth.notSuperadmin))
    }

    try {
      // Execute the service
      const result = await this.createUserWithInvitationService.execute({
        email: ctx.body.email,
        firstName: ctx.body.firstName,
        lastName: ctx.body.lastName,
        displayName: ctx.body.displayName,
        phoneCountryCode: ctx.body.phoneCountryCode,
        phoneNumber: ctx.body.phoneNumber,
        idDocumentType: ctx.body.idDocumentType,
        idDocumentNumber: ctx.body.idDocumentNumber,
        condominiumId: ctx.body.condominiumId,
        roleId: ctx.body.roleId,
        customPermissions: ctx.body.customPermissions,
        createdBy: superadminUser.userId,
        expirationDays: ctx.body.expirationDays,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          // Map service error messages to translated messages
          let translatedError = result.error
          if (result.error.includes('Role')) {
            translatedError = t(LocaleDictionary.http.controllers.userInvitations.roleNotFound)
          } else if (result.error.includes('Condominium')) {
            translatedError = t(LocaleDictionary.http.controllers.userInvitations.condominiumNotFound)
          } else if (result.error.includes('Permission')) {
            translatedError = t(LocaleDictionary.http.controllers.userInvitations.permissionNotFound)
          }
          throw AppError.notFound(translatedError)
        }
        if (result.code === 'CONFLICT') {
          // Map service error messages to translated messages
          let translatedError = result.error
          if (result.error.includes('pending invitation')) {
            translatedError = t(LocaleDictionary.http.controllers.userInvitations.pendingInvitationExists)
          } else if (result.error.includes('active')) {
            translatedError = t(LocaleDictionary.http.controllers.userInvitations.userActiveUseAssignRole)
          }
          throw AppError.conflict(translatedError)
        }
        throw AppError.validation(result.error)
      }

      // Get the condominium and role names for the email
      let condominiumName: string | null = null
      if (ctx.body.condominiumId) {
        const condominium = await this.condominiumsRepository.getById(ctx.body.condominiumId)
        condominiumName = condominium?.name ?? null
      }

      const role = await this.rolesRepository.getById(ctx.body.roleId)
      const roleName = role?.name ?? 'Usuario'

      // Send invitation email
      const recipientName =
        result.data.user.displayName ||
        `${result.data.user.firstName || ''} ${result.data.user.lastName || ''}`.trim() ||
        result.data.user.email

      const emailResult = await this.sendUserInvitationEmailService.execute({
        to: result.data.user.email,
        recipientName,
        condominiumName,
        roleName,
        invitationToken: result.data.invitationToken,
        expiresAt: result.data.invitation.expiresAt,
      })

      if (!emailResult.success) {
        logger.error(
          {
            err: emailResult.error,
            invitationId: result.data.invitation.id,
            email: result.data.user.email,
          },
          'Failed to send user invitation email'
        )

        // Record the email error in the invitation
        await this.invitationsRepository.recordEmailError(
          result.data.invitation.id,
          emailResult.error
        )
      }

      return ctx.created({
        data: {
          user: result.data.user,
          invitation: result.data.invitation,
          userRole: result.data.userRole,
          userPermissions: result.data.userPermissions,
          emailSent: emailResult.success,
          // Include the token for development/testing purposes
          invitationToken: result.data.invitationToken,
        },
      })
    } catch (error) {
      logger.error(`Error creating user with invitation: ${error}`)
      if (error instanceof AppError) {
        throw error
      }
      throw error
    }
  }

  /**
   * Validate an invitation token.
   * Returns invitation details and validity status.
   * This is a public endpoint for the invitation confirmation page.
   */
  private validateToken = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<unknown, unknown, TTokenParam>(c)

    const result = await this.validateUserInvitationTokenService.execute({
      token: ctx.params.token,
    })

    if (!result.success) {
      throw AppError.notFound('Invitation')
    }

    return ctx.ok({
      data: {
        isValid: result.data.isValid,
        isExpired: result.data.isExpired,
        user: {
          email: result.data.user.email,
          firstName: result.data.user.firstName,
          lastName: result.data.user.lastName,
          phoneCountryCode: result.data.user.phoneCountryCode,
          phoneNumber: result.data.user.phoneNumber,
        },
        condominium: result.data.condominium
          ? {
              id: result.data.condominium.id,
              name: result.data.condominium.name,
            }
          : null,
        role: {
          id: result.data.role.id,
          name: result.data.role.name,
        },
      },
    })
  }

  /**
   * Accept an invitation.
   * Requires a valid Firebase token in the Authorization header.
   * Updates the user with the Firebase UID and activates user/role.
   */
  private acceptInvitation = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<unknown, unknown, TTokenParam>(c)
    const t = useTranslation(c)

    // Get and verify the Firebase token
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized(t(LocaleDictionary.http.middlewares.utils.auth.malformedHeader))
    }

    const token = authHeader.slice(7)

    try {
      const decodedToken = await admin.auth().verifyIdToken(token)

      const result = await this.acceptUserInvitationService.execute({
        token: ctx.params.token,
        firebaseUid: decodedToken.uid,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          throw AppError.notFound('Invitation')
        }
        if (result.code === 'CONFLICT') {
          throw AppError.alreadyExists('User', 'firebaseUid')
        }
        throw AppError.validation(result.error)
      }

      return ctx.ok({
        data: {
          user: result.data.user,
          invitation: result.data.invitation,
        },
      })
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw AppError.invalidToken()
    }
  }

  /**
   * Resend invitation email.
   * This endpoint should be protected by admin/superadmin middleware.
   */
  private resendEmail = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<unknown, unknown, TIdParam>(c)

    // Get the invitation
    const invitation = await this.invitationsRepository.getById(ctx.params.id)

    if (!invitation) {
      throw AppError.notFound('Invitation')
    }

    if (invitation.status !== 'pending') {
      throw AppError.validation('Cannot resend email for non-pending invitation')
    }

    // Get the user, condominium, and role
    const user = await this.usersRepository.getById(invitation.userId)
    if (!user) {
      throw AppError.notFound('User not found')
    }

    let condominiumName: string | null = null
    if (invitation.condominiumId) {
      const condominium = await this.condominiumsRepository.getById(invitation.condominiumId)
      condominiumName = condominium?.name ?? null
    }

    const role = await this.rolesRepository.getById(invitation.roleId)
    const roleName = role?.name ?? 'Usuario'

    // Generate a new token for the invitation
    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const newToken = Buffer.from(tokenBytes).toString('base64url')
    const newTokenHash = await Bun.password.hash(newToken, {
      algorithm: 'argon2id',
      memoryCost: 4,
      timeCost: 3,
    })

    // Update the invitation with the new token
    await this.invitationsRepository.regenerateToken(invitation.id, newToken, newTokenHash)

    // Send the email
    const recipientName =
      user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email

    const emailResult = await this.sendUserInvitationEmailService.execute({
      to: user.email,
      recipientName,
      condominiumName,
      roleName,
      invitationToken: newToken,
      expiresAt: invitation.expiresAt,
    })

    if (!emailResult.success) {
      logger.error(
        { err: emailResult.error, invitationId: invitation.id, email: user.email },
        'Failed to resend user invitation email'
      )

      await this.invitationsRepository.recordEmailError(invitation.id, emailResult.error)

      throw AppError.validation(`Failed to send email: ${emailResult.error}`)
    }

    return ctx.ok({
      data: {
        success: true,
        message: 'Invitation email sent successfully',
      },
    })
  }

  /**
   * Cancel an invitation.
   * This endpoint should be protected by admin/superadmin middleware.
   */
  private cancelInvitation = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<unknown, unknown, TIdParam>(c)

    const invitation = await this.invitationsRepository.getById(ctx.params.id)

    if (!invitation) {
      throw AppError.notFound('Invitation')
    }

    if (invitation.status !== 'pending') {
      throw AppError.validation('Cannot cancel a non-pending invitation')
    }

    const cancelled = await this.invitationsRepository.markAsCancelled(invitation.id)

    if (!cancelled) {
      throw AppError.validation('Failed to cancel invitation')
    }

    return ctx.ok({ data: cancelled })
  }
}
