import type { Context } from 'hono'
import {
  roleCreateSchema,
  roleUpdateSchema,
  type TRole,
  type TRoleCreate,
  type TRoleUpdate,
} from '@packages/domain'
import type { RolesRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { GetAssignableRolesService } from '@src/services/roles'
import { z } from 'zod'

const NameParamSchema = z.object({
  name: z.string().min(1),
})

type TNameParam = z.infer<typeof NameParamSchema>

/**
 * Controller for managing role resources.
 *
 * Endpoints:
 * - GET    /              List all roles
 * - GET    /system        Get system roles
 * - GET    /assignable    Get assignable roles (all except SUPERADMIN)
 * - GET    /name/:name    Get by name
 * - GET    /:id           Get by ID
 * - POST   /              Create role
 * - PATCH  /:id           Update role
 * - DELETE /:id           Delete role (hard delete)
 */
export class RolesController extends BaseController<TRole, TRoleCreate, TRoleUpdate> {
  private getAssignableRolesService: GetAssignableRolesService

  constructor(repository: RolesRepository) {
    super(repository)
    this.getAssignableRolesService = new GetAssignableRolesService(repository)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole('SUPERADMIN')] },
      {
        method: 'get',
        path: '/system',
        handler: this.getSystemRoles,
        middlewares: [authMiddleware, requireRole('SUPERADMIN')],
      },
      {
        method: 'get',
        path: '/assignable',
        handler: this.getAssignableRoles,
        middlewares: [authMiddleware, requireRole('SUPERADMIN')],
      },
      {
        method: 'get',
        path: '/name/:name',
        handler: this.getByName,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(NameParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), bodyValidator(roleCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          requireRole('SUPERADMIN'),
          paramsValidator(IdParamSchema),
          bodyValidator(roleUpdateSchema),
        ],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private getByName = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TNameParam>(c)
    const repo = this.repository as RolesRepository

    try {
      const role = await repo.getByName(ctx.params.name)

      if (!role) {
        return ctx.notFound({ error: 'Role not found' })
      }

      return ctx.ok({ data: role })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getSystemRoles = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const repo = this.repository as RolesRepository

    try {
      const roles = await repo.getSystemRoles()
      return ctx.ok({ data: roles })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getAssignableRoles = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)

    try {
      const result = await this.getAssignableRolesService.execute()

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
