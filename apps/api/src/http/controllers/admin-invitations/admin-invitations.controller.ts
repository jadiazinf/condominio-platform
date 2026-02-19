import type { Context } from 'hono'
import { z } from 'zod'
import { ETaxIdTypes, EIdDocumentTypes, EPreferredLanguages, ESystemRole } from '@packages/domain'
import type {
  AdminInvitationsRepository,
  UsersRepository,
  ManagementCompaniesRepository,
  ManagementCompanyMembersRepository,
  UserRolesRepository,
  RolesRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { HttpContext } from '../../context'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import {
  isUserAuthenticated,
  AUTHENTICATED_USER_PROP,
} from '../../middlewares/utils/auth/is-user-authenticated'
import { isTokenValid, DECODED_TOKEN_PROP } from '../../middlewares/utils/auth/is-token-valid'
import { requireRole } from '../../middlewares/auth'
import { createRouter } from '../create-router'
import type { TRouteDefinition } from '../types'
import { AppError } from '@errors/index'
import {
  CreateCompanyWithAdminService,
  CreateCompanyWithExistingAdminService,
  ValidateInvitationTokenService,
  AcceptInvitationService,
  CancelInvitationService,
} from '@src/services/admin-invitations'
import { SendInvitationEmailService } from '@src/services/email'
import { generateSecureToken, hashToken } from '@utils/token'
import logger from '@utils/logger'

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const CreateCompanyWithAdminSchema = z.object({
  company: z.object({
    name: z.string().min(1),
    legalName: z.string().nullable().default(null),
    taxIdType: z.enum(ETaxIdTypes).nullable().default(null),
    taxIdNumber: z.string().nullable().default(null),
    email: z.string().email().nullable().default(null),
    phoneCountryCode: z.string().nullable().default(null),
    phone: z.string().nullable().default(null),
    website: z.string().nullable().default(null),
    address: z.string().nullable().default(null),
    locationId: z.string().uuid().nullable().default(null),
    logoUrl: z.string().nullable().default(null),
    metadata: z.record(z.string(), z.unknown()).nullable().default(null),
  }),
  admin: z.object({
    email: z.string().email(),
    displayName: z.string().nullable().default(null),
    phoneCountryCode: z.string().nullable().default(null),
    phoneNumber: z.string().nullable().default(null),
    photoUrl: z.string().nullable().default(null),
    firstName: z.string().nullable().default(null),
    lastName: z.string().nullable().default(null),
    idDocumentType: z.enum(EIdDocumentTypes).nullable().default(null),
    idDocumentNumber: z.string().nullable().default(null),
    address: z.string().nullable().default(null),
    locationId: z.string().uuid().nullable().default(null),
    preferredLanguage: z.enum(EPreferredLanguages).default('es'),
    preferredCurrencyId: z.string().uuid().nullable().default(null),
    lastLogin: z.date().nullable().default(null),
    metadata: z.record(z.string(), z.unknown()).nullable().default(null),
  }),
})

type TCreateCompanyWithAdminBody = z.infer<typeof CreateCompanyWithAdminSchema>

const CreateCompanyWithExistingAdminSchema = z.object({
  company: z.object({
    name: z.string().min(1),
    legalName: z.string().nullable().default(null),
    taxIdType: z.enum(ETaxIdTypes).nullable().default(null),
    taxIdNumber: z.string().nullable().default(null),
    email: z.string().email().nullable().default(null),
    phoneCountryCode: z.string().nullable().default(null),
    phone: z.string().nullable().default(null),
    website: z.string().nullable().default(null),
    address: z.string().nullable().default(null),
    locationId: z.string().uuid().nullable().default(null),
    logoUrl: z.string().nullable().default(null),
    metadata: z.record(z.string(), z.unknown()).nullable().default(null),
  }),
  existingUserId: z.string().uuid(),
})

type TCreateCompanyWithExistingAdminBody = z.infer<typeof CreateCompanyWithExistingAdminSchema>

const TokenParamSchema = z.object({
  token: z.string().min(1),
})

type TTokenParam = z.infer<typeof TokenParamSchema>

const IdParamSchema = z.object({
  id: z.string().uuid(),
})

type TIdParam = z.infer<typeof IdParamSchema>

/**
 * Controller for admin invitation endpoints.
 *
 * Endpoints:
 * - POST   /create-with-admin              Create management company with new admin (superadmin only)
 * - POST   /create-with-existing-admin    Create management company with existing user as admin (superadmin only)
 * - POST   /:id/resend-email              Resend invitation email (superadmin only)
 * - GET    /validate/:token               Validate invitation token (public)
 * - POST   /accept/:token                 Accept invitation (public, requires Firebase token)
 * - DELETE /:id                           Cancel invitation (superadmin only)
 */
export class AdminInvitationsController {
  private readonly createCompanyWithAdminService: CreateCompanyWithAdminService
  private readonly createCompanyWithExistingAdminService: CreateCompanyWithExistingAdminService
  private readonly validateInvitationTokenService: ValidateInvitationTokenService
  private readonly acceptInvitationService: AcceptInvitationService
  private readonly cancelInvitationService: CancelInvitationService
  private readonly sendInvitationEmailService: SendInvitationEmailService

  constructor(
    private readonly db: TDrizzleClient,
    private readonly invitationsRepository: AdminInvitationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly managementCompaniesRepository: ManagementCompaniesRepository,
    private readonly membersRepository: ManagementCompanyMembersRepository,
    private readonly userRolesRepository: UserRolesRepository,
    private readonly rolesRepository: RolesRepository
  ) {
    this.createCompanyWithAdminService = new CreateCompanyWithAdminService(
      db,
      invitationsRepository,
      usersRepository,
      managementCompaniesRepository,
      membersRepository,
      userRolesRepository,
      rolesRepository
    )
    this.createCompanyWithExistingAdminService = new CreateCompanyWithExistingAdminService(
      db,
      usersRepository,
      managementCompaniesRepository,
      membersRepository,
      userRolesRepository,
      rolesRepository
    )
    this.validateInvitationTokenService = new ValidateInvitationTokenService(
      invitationsRepository,
      usersRepository,
      managementCompaniesRepository
    )
    this.acceptInvitationService = new AcceptInvitationService(
      db,
      invitationsRepository,
      usersRepository,
      managementCompaniesRepository,
      membersRepository,
      userRolesRepository,
      rolesRepository
    )
    this.cancelInvitationService = new CancelInvitationService(invitationsRepository)
    this.sendInvitationEmailService = new SendInvitationEmailService()
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'post',
        path: '/create-with-admin',
        handler: this.createWithAdmin,
        middlewares: [isUserAuthenticated, requireRole(ESystemRole.SUPERADMIN), bodyValidator(CreateCompanyWithAdminSchema)],
      },
      {
        method: 'post',
        path: '/create-with-existing-admin',
        handler: this.createWithExistingAdmin,
        middlewares: [
          isUserAuthenticated,
          requireRole(ESystemRole.SUPERADMIN),
          bodyValidator(CreateCompanyWithExistingAdminSchema),
        ],
      },
      {
        method: 'post',
        path: '/:id/resend-email',
        handler: this.resendEmail,
        middlewares: [isUserAuthenticated, requireRole(ESystemRole.SUPERADMIN), paramsValidator(IdParamSchema)],
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
        middlewares: [isTokenValid, paramsValidator(TokenParamSchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.cancelInvitation,
        middlewares: [isUserAuthenticated, requireRole(ESystemRole.SUPERADMIN), paramsValidator(IdParamSchema)],
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
   * Create a management company with a new admin user.
   * Protected by isUserAuthenticated + isSuperadmin middleware.
   */
  private createWithAdmin = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<TCreateCompanyWithAdminBody>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    try {
      const result = await this.createCompanyWithAdminService.execute({
        company: ctx.body.company,
        admin: ctx.body.admin,
        createdBy: user.id,
      })

      if (!result.success) {
        if (result.code === 'CONFLICT') {
          throw AppError.alreadyExists('User', 'email')
        }
        throw AppError.validation(result.error)
      }

      // Send invitation email
      const recipientName =
        result.data.admin.displayName ||
        `${result.data.admin.firstName || ''} ${result.data.admin.lastName || ''}`.trim() ||
        result.data.admin.email

      const emailResult = await this.sendInvitationEmailService.execute({
        to: result.data.admin.email,
        recipientName,
        companyName: result.data.company.name,
        invitationToken: result.data.invitationToken,
        expiresAt: result.data.invitation.expiresAt,
      })

      if (!emailResult.success) {
        // Log the error but don't fail the request - the invitation was created successfully
        logger.error(
          {
            err: emailResult.error,
            invitationId: result.data.invitation.id,
            email: result.data.admin.email,
          },
          'Failed to send invitation email'
        )

        // Record the email error in the invitation
        await this.invitationsRepository.recordEmailError(
          result.data.invitation.id,
          emailResult.error
        )
      } else {
        logger.info(
          {
            invitationId: result.data.invitation.id,
            email: result.data.admin.email,
            tokenPrefix: result.data.invitationToken.substring(0, 8),
          },
          'Invitation email sent successfully'
        )
      }

      // Verify invitation was persisted by re-reading from DB
      const verifyInvitation = await this.invitationsRepository.getByToken(
        result.data.invitationToken
      )
      if (!verifyInvitation) {
        logger.error(
          {
            invitationId: result.data.invitation.id,
            tokenPrefix: result.data.invitationToken.substring(0, 8),
          },
          'CRITICAL: Invitation was created but cannot be found by token in DB!'
        )
      } else {
        logger.info(
          {
            invitationId: verifyInvitation.id,
            tokenMatch: verifyInvitation.token === result.data.invitationToken,
          },
          'Invitation verified in database after creation'
        )
      }

      return ctx.created({
        data: {
          company: result.data.company,
          admin: result.data.admin,
          member: result.data.member,
          invitation: result.data.invitation,
          emailSent: emailResult.success,
          // Include the token for development/testing purposes
          invitationToken: result.data.invitationToken,
        },
      })
    } catch (error) {
      logger.error(`Error creating company with admin ${error}`)
      if (error instanceof AppError) {
        throw error
      }
      throw error
    }
  }

  /**
   * Create a management company with an existing user as admin.
   * Protected by isUserAuthenticated + isSuperadmin middleware.
   */
  private createWithExistingAdmin = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<TCreateCompanyWithExistingAdminBody>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    try {
      const result = await this.createCompanyWithExistingAdminService.execute({
        company: ctx.body.company,
        existingUserId: ctx.body.existingUserId,
        createdBy: user.id,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          throw AppError.notFound('User')
        }
        if (result.code === 'BAD_REQUEST') {
          throw AppError.validation(result.error)
        }
        throw AppError.validation(result.error)
      }

      return ctx.created({
        data: {
          company: result.data.company,
          admin: result.data.admin,
          member: result.data.member,
        },
      })
    } catch (error) {
      logger.error(`Error creating company with existing admin ${error}`)
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

    logger.info(
      {
        tokenLength: ctx.params.token.length,
        tokenPrefix: ctx.params.token.substring(0, 8),
      },
      'Received invitation token validation request'
    )

    const result = await this.validateInvitationTokenService.execute({
      token: ctx.params.token,
    })

    if (!result.success) {
      logger.warn(
        {
          tokenPrefix: ctx.params.token.substring(0, 8),
          error: result.error,
        },
        'Invitation token validation failed'
      )
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
        managementCompany: {
          name: result.data.managementCompany.name,
        },
      },
    })
  }

  /**
   * Accept an invitation.
   * Protected by isTokenValid middleware (verifies Firebase token without DB user lookup).
   * Updates the user with the Firebase UID and activates user/company.
   */
  private acceptInvitation = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<unknown, unknown, TTokenParam>(c)
    const decodedToken = c.get(DECODED_TOKEN_PROP)

    const result = await this.acceptInvitationService.execute({
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
        managementCompany: result.data.managementCompany,
      },
    })
  }

  /**
   * Resend invitation email.
   * Protected by isUserAuthenticated + isSuperadmin middleware.
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

    // Get the user and company (include inactive — invitation users/companies are inactive until accepted)
    const user = await this.usersRepository.getById(invitation.userId, true)
    const company = await this.managementCompaniesRepository.getById(invitation.managementCompanyId, true)

    if (!user || !company) {
      throw AppError.notFound('User or company not found')
    }

    // Generate a new token for the invitation (same method as initial creation)
    const newToken = generateSecureToken()
    const newTokenHash = hashToken(newToken)

    // Update the invitation with the new token
    await this.invitationsRepository.regenerateToken(invitation.id, newToken, newTokenHash)

    // Send the email
    const recipientName =
      user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email

    const emailResult = await this.sendInvitationEmailService.execute({
      to: user.email,
      recipientName,
      companyName: company.name,
      invitationToken: newToken,
      expiresAt: invitation.expiresAt,
    })

    if (!emailResult.success) {
      logger.error(
        { err: emailResult.error, invitationId: invitation.id, email: user.email },
        'Failed to resend invitation email'
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
   * Protected by isUserAuthenticated + isSuperadmin middleware.
   */
  private cancelInvitation = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<unknown, unknown, TIdParam>(c)

    const result = await this.cancelInvitationService.execute({
      invitationId: ctx.params.id,
    })

    if (!result.success) {
      if (result.code === 'NOT_FOUND') {
        throw AppError.notFound('Invitation')
      }
      throw AppError.validation(result.error)
    }

    return ctx.ok({ data: result.data })
  }
}
