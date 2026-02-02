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
import type { UsersRepository, UserPermissionsRepository } from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, tokenOnlyMiddleware } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import {
  GetUserByEmailService,
  GetUserByFirebaseUidService,
  UpdateLastLoginService,
  GetUserCondominiumsService,
  SyncFirebaseUidService,
  ListAllUsersPaginatedService,
  GetUserFullDetailsService,
  UpdateUserStatusService,
  GetAllRolesService,
  ToggleUserPermissionService,
} from '@src/services/users'
import { queryValidator } from '../../middlewares/utils/payload-validator'
import { AppError } from '@errors/index'

const EmailParamSchema = z.object({
  email: z.email('Invalid email format'),
})

const AllUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform(val => (val === 'true' ? true : val === 'false' ? false : undefined)),
  roleId: z.uuid().optional(),
})

type TAllUsersQuery = z.infer<typeof AllUsersQuerySchema>

const UpdateStatusSchema = z.object({
  isActive: z.boolean(),
})

const TogglePermissionSchema = z.object({
  permissionId: z.uuid(),
  isEnabled: z.boolean(),
})

type TEmailParam = z.infer<typeof EmailParamSchema>

const FirebaseUidParamSchema = z.object({
  firebaseUid: z.string().min(1),
})

type TFirebaseUidParam = z.infer<typeof FirebaseUidParamSchema>

type TIdParam = z.infer<typeof IdParamSchema>

const SyncFirebaseUidSchema = z.object({
  email: z.email('Invalid email format'),
  firebaseUid: z.string().min(1),
})

type TSyncFirebaseUidBody = z.infer<typeof SyncFirebaseUidSchema>

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
  private readonly syncFirebaseUidService: SyncFirebaseUidService
  private readonly listAllUsersPaginatedService: ListAllUsersPaginatedService
  private readonly getUserFullDetailsService: GetUserFullDetailsService
  private readonly updateUserStatusService: UpdateUserStatusService
  private readonly getAllRolesService: GetAllRolesService
  private readonly toggleUserPermissionService: ToggleUserPermissionService

  constructor(
    repository: UsersRepository,
    db: TDrizzleClient,
    userPermissionsRepository: UserPermissionsRepository
  ) {
    super(repository)

    // Initialize services
    this.getUserByEmailService = new GetUserByEmailService(repository)
    this.getUserByFirebaseUidService = new GetUserByFirebaseUidService(repository)
    this.updateLastLoginService = new UpdateLastLoginService(repository)
    this.getUserCondominiumsService = new GetUserCondominiumsService(db)
    this.syncFirebaseUidService = new SyncFirebaseUidService(repository)
    this.listAllUsersPaginatedService = new ListAllUsersPaginatedService(repository)
    this.getUserFullDetailsService = new GetUserFullDetailsService(repository)
    this.updateUserStatusService = new UpdateUserStatusService(repository)
    this.getAllRolesService = new GetAllRolesService(repository)
    this.toggleUserPermissionService = new ToggleUserPermissionService(userPermissionsRepository)
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
      // New paginated endpoint with filters
      {
        method: 'get',
        path: '/paginated',
        handler: this.listPaginated,
        middlewares: [authMiddleware, queryValidator(AllUsersQuerySchema)],
      },
      // Roles for filter dropdown
      {
        method: 'get',
        path: '/roles',
        handler: this.getRoles,
        middlewares: [authMiddleware],
      },
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
        method: 'post',
        path: '/sync-firebase-uid',
        handler: this.syncFirebaseUid,
        middlewares: [tokenOnlyMiddleware, bodyValidator(SyncFirebaseUidSchema)],
      },
      // Full details endpoint (must be before /:id)
      {
        method: 'get',
        path: '/:id/full',
        handler: this.getFullDetails,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
      // Status update endpoint
      {
        method: 'patch',
        path: '/:id/status',
        handler: this.updateStatus,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema), bodyValidator(UpdateStatusSchema)],
      },
      // Permission toggle endpoint
      {
        method: 'patch',
        path: '/:id/permissions',
        handler: this.togglePermission,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema), bodyValidator(TogglePermissionSchema)],
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

  /**
   * Sync Firebase UID for an existing user by email.
   * This handles cases where a user exists with a different Firebase UID
   * (e.g., when testing across different environments).
   */
  private syncFirebaseUid = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TSyncFirebaseUidBody>(c)
    const { email, firebaseUid } = ctx.body

    const result = await this.syncFirebaseUidService.execute({
      email,
      firebaseUid,
    })

    if (!result.success) {
      throw AppError.notFound('User', email)
    }

    return ctx.ok({ data: result.data, message: 'Firebase UID synced successfully' })
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

  /**
   * List all users with pagination, search, and filtering.
   * GET /users/paginated
   */
  private listPaginated = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TAllUsersQuery>(c)

    const result = await this.listAllUsersPaginatedService.execute({
      query: ctx.query,
    })

    if (!result.success) {
      throw AppError.internal(result.error)
    }

    return ctx.ok(result.data)
  }

  /**
   * Get all roles for filter dropdown.
   * GET /users/roles
   */
  private getRoles = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)

    const result = await this.getAllRolesService.execute()

    if (!result.success) {
      throw AppError.internal(result.error)
    }

    return ctx.ok({ data: result.data })
  }

  /**
   * Get full user details including roles, condominiums, and permissions.
   * GET /users/:id/full
   */
  private getFullDetails = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TIdParam>(c)

    const result = await this.getUserFullDetailsService.execute({
      userId: ctx.params.id,
    })

    if (!result.success) {
      if (result.code === 'NOT_FOUND') {
        throw AppError.notFound('User', ctx.params.id)
      }
      throw AppError.internal(result.error)
    }

    return ctx.ok({ data: result.data })
  }

  /**
   * Update user status (isActive).
   * PATCH /users/:id/status
   */
  private updateStatus = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<{ isActive: boolean }, unknown, TIdParam>(c)

    const result = await this.updateUserStatusService.execute({
      userId: ctx.params.id,
      isActive: ctx.body.isActive,
    })

    if (!result.success) {
      if (result.code === 'NOT_FOUND') {
        throw AppError.notFound('User', ctx.params.id)
      }
      throw AppError.internal(result.error)
    }

    return ctx.ok({ data: result.data, message: 'User status updated successfully' })
  }

  /**
   * Toggle a user's permission.
   * PATCH /users/:id/permissions
   * Note: Users cannot modify their own permissions.
   */
  private togglePermission = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<{ permissionId: string; isEnabled: boolean }, unknown, TIdParam>(c)
    const currentUser = ctx.getAuthenticatedUser()

    // Prevent users from modifying their own permissions
    if (currentUser.id === ctx.params.id) {
      throw AppError.forbidden('You cannot modify your own permissions')
    }

    const result = await this.toggleUserPermissionService.execute({
      userId: ctx.params.id,
      permissionId: ctx.body.permissionId,
      isEnabled: ctx.body.isEnabled,
      assignedBy: currentUser.id,
    })

    if (!result.success) {
      throw AppError.internal(result.error)
    }

    return ctx.ok({ data: result.data, message: 'Permission updated successfully' })
  }
}
