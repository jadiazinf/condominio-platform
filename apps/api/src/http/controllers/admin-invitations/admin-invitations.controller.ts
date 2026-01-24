import type { Context } from 'hono'
import { z } from 'zod'
import { useTranslation } from '@intlify/hono'
import { admin } from '@libs/firebase/config'
import { ETaxIdTypes, EIdDocumentTypes, EPreferredLanguages } from '@packages/domain'
import type {
  AdminInvitationsRepository,
  UsersRepository,
  ManagementCompaniesRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { HttpContext } from '../../context'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { createRouter } from '../create-router'
import type { TRouteDefinition } from '../types'
import { AppError } from '@errors/index'
import {
  CreateCompanyWithAdminService,
  ValidateInvitationTokenService,
  AcceptInvitationService,
  CancelInvitationService,
} from '@src/services/admin-invitations'
import { SendInvitationEmailService } from '@src/services/email'
import { LocaleDictionary } from '@locales/dictionary'
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
 * - POST   /create-with-admin        Create management company with new admin (superadmin only)
 * - POST   /:id/resend-email         Resend invitation email (superadmin only)
 * - GET    /validate/:token          Validate invitation token (public)
 * - POST   /accept/:token            Accept invitation (public, requires Firebase token)
 * - DELETE /:id                      Cancel invitation (superadmin only)
 */
export class AdminInvitationsController {
  private readonly createCompanyWithAdminService: CreateCompanyWithAdminService
  private readonly validateInvitationTokenService: ValidateInvitationTokenService
  private readonly acceptInvitationService: AcceptInvitationService
  private readonly cancelInvitationService: CancelInvitationService
  private readonly sendInvitationEmailService: SendInvitationEmailService

  constructor(
    private readonly db: TDrizzleClient,
    private readonly invitationsRepository: AdminInvitationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly managementCompaniesRepository: ManagementCompaniesRepository
  ) {
    this.createCompanyWithAdminService = new CreateCompanyWithAdminService(
      invitationsRepository,
      usersRepository,
      managementCompaniesRepository
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
      managementCompaniesRepository
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
        middlewares: [bodyValidator(CreateCompanyWithAdminSchema)],
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
   * Create a management company with a new admin user.
   * This endpoint should be protected by superadmin middleware.
   */
  private createWithAdmin = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<TCreateCompanyWithAdminBody>(c)
    const t = useTranslation(c)

    // Get the superadmin user from context (set by auth middleware)
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized(t(LocaleDictionary.http.middlewares.utils.auth.malformedHeader))
    }

    const token = authHeader.slice(7)

    let decodedToken: { uid: string }
    try {
      decodedToken = await admin.auth().verifyIdToken(token)
    } catch (error) {
      throw AppError.invalidToken()
    }

    try {
      const creatorUser = await this.usersRepository.getByFirebaseUid(decodedToken.uid)

      if (!creatorUser) {
        throw AppError.unauthorized('User not found')
      }

      const result = await this.createCompanyWithAdminService.execute({
        company: ctx.body.company,
        admin: ctx.body.admin,
        createdBy: creatorUser.id,
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
      }

      return ctx.created({
        data: {
          company: result.data.company,
          admin: result.data.admin,
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
   * Validate an invitation token.
   * Returns invitation details and validity status.
   * This is a public endpoint for the invitation confirmation page.
   */
  private validateToken = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<unknown, unknown, TTokenParam>(c)

    const result = await this.validateInvitationTokenService.execute({
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
        managementCompany: {
          name: result.data.managementCompany.name,
        },
      },
    })
  }

  /**
   * Accept an invitation.
   * Requires a valid Firebase token in the Authorization header.
   * Updates the user with the Firebase UID and activates user/company.
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
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw AppError.invalidToken()
    }
  }

  /**
   * Resend invitation email.
   * This endpoint should be protected by superadmin middleware.
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

    // Get the user and company
    const user = await this.usersRepository.getById(invitation.userId)
    const company = await this.managementCompaniesRepository.getById(invitation.managementCompanyId)

    if (!user || !company) {
      throw AppError.notFound('User or company not found')
    }

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
   * This endpoint should be protected by superadmin middleware.
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
