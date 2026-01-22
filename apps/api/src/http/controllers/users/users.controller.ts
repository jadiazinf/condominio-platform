import type { Context } from 'hono'
import {
  userCreateSchema,
  userUpdateSchema,
  userUpdateProfileSchema,
  type TUser,
  type TUserCreate,
  type TUserUpdate,
  type TUserUpdateProfile,
} from '@packages/domain'
import type { UsersRepository } from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import {
  GetUserByEmailService,
  GetUserByFirebaseUidService,
  UpdateLastLoginService,
  GetUserCondominiumsService,
} from '@src/services/users'
import { AppError } from '@errors/index'

const EmailParamSchema = z.object({
  email: z.email('Invalid email format'),
})

type TEmailParam = z.infer<typeof EmailParamSchema>

const FirebaseUidParamSchema = z.object({
  firebaseUid: z.string().min(1),
})

type TFirebaseUidParam = z.infer<typeof FirebaseUidParamSchema>

type TIdParam = z.infer<typeof IdParamSchema>

/**
 * Controller for managing user resources.
 *
 * Endpoints:
 * - GET    /me                         Get current authenticated user
 * - GET    /me/condominiums            Get condominiums the user has access to
 * - GET    /                           List all users
 * - GET    /email/:email               Get user by email
 * - GET    /firebase/:firebaseUid      Get user by Firebase UID
 * - GET    /:id                        Get user by ID
 * - POST   /:id/last-login             Update user's last login
 * - POST   /                           Create user
 * - PATCH  /:id                        Update user
 * - DELETE /:id                        Delete user
 */
export class UsersController extends BaseController<TUser, TUserCreate, TUserUpdate> {
  private readonly getUserByEmailService: GetUserByEmailService
  private readonly getUserByFirebaseUidService: GetUserByFirebaseUidService
  private readonly updateLastLoginService: UpdateLastLoginService
  private readonly getUserCondominiumsService: GetUserCondominiumsService

  constructor(repository: UsersRepository, db: TDrizzleClient) {
    super(repository)

    // Initialize services
    this.getUserByEmailService = new GetUserByEmailService(repository)
    this.getUserByFirebaseUidService = new GetUserByFirebaseUidService(repository)
    this.updateLastLoginService = new UpdateLastLoginService(repository)
    this.getUserCondominiumsService = new GetUserCondominiumsService(db)
  }

  get routes(): TRouteDefinition[] {
    return [
      // /me routes must be before /:id to avoid being matched as an ID
      { method: 'get', path: '/me', handler: this.getCurrentUser, middlewares: [authMiddleware] },
      {
        method: 'patch',
        path: '/me',
        handler: this.updateCurrentUser,
        middlewares: [authMiddleware, bodyValidator(userUpdateProfileSchema)],
      },
      {
        method: 'get',
        path: '/me/condominiums',
        handler: this.getCondominiums,
        middlewares: [authMiddleware],
      },
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware] },
      {
        method: 'get',
        path: '/email/:email',
        handler: this.getByEmail,
        middlewares: [authMiddleware, paramsValidator(EmailParamSchema)],
      },
      {
        method: 'get',
        path: '/firebase/:firebaseUid',
        handler: this.getByFirebaseUid,
        middlewares: [authMiddleware, paramsValidator(FirebaseUidParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/:id/last-login',
        handler: this.updateLastLogin,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, bodyValidator(userCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          paramsValidator(IdParamSchema),
          bodyValidator(userUpdateSchema),
        ],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers (Arrow functions for automatic 'this' binding)
  // ─────────────────────────────────────────────────────────────────────────────

  private getByEmail = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TEmailParam>(c)
    const result = await this.getUserByEmailService.execute({
      email: ctx.params.email,
    })

    if (!result.success) {
      throw AppError.notFound('User', ctx.params.email)
    }

    return ctx.ok({ data: result.data })
  }

  private getByFirebaseUid = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TFirebaseUidParam>(c)
    const result = await this.getUserByFirebaseUidService.execute({
      firebaseUid: ctx.params.firebaseUid,
    })

    if (!result.success) {
      throw AppError.notFound('User', ctx.params.firebaseUid)
    }

    return ctx.ok({ data: result.data })
  }

  private updateLastLogin = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TIdParam>(c)
    const result = await this.updateLastLoginService.execute({
      userId: ctx.params.id,
    })

    if (!result.success) {
      throw AppError.notFound('User', ctx.params.id)
    }

    return ctx.ok({ data: result.data })
  }

  /**
   * Get the current authenticated user.
   * The user is already available in the context from the auth middleware.
   */
  private getCurrentUser = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const user = ctx.getAuthenticatedUser()
    return ctx.ok({ data: user })
  }

  /**
   * Update the current authenticated user's profile.
   * Only allows modifying fields defined in userUpdateProfileSchema.
   */
  private updateCurrentUser = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TUserUpdateProfile>(c)
    const user = ctx.getAuthenticatedUser()
    const data = ctx.body

    const result = await this.repository.update(user.id, data)

    if (!result) {
      throw AppError.notFound('User', user.id)
    }

    return ctx.ok({ data: result, message: 'Profile updated successfully' })
  }

  /**
   * Get all condominiums the authenticated user has access to.
   * This includes condominiums where the user owns/rents units or has roles assigned.
   */
  private getCondominiums = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const user = ctx.getAuthenticatedUser()

    const result = await this.getUserCondominiumsService.execute({
      userId: user.id,
    })

    if (!result.success) {
      throw AppError.internal(result.error)
    }

    return ctx.ok({ data: result.data })
  }
}
