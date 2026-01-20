import type { Context } from 'hono'
import {
  superadminUserPermissionCreateSchema,
  type TSuperadminUserPermission,
  type TSuperadminUserPermissionCreate,
} from '@packages/domain'
import type { SuperadminUserPermissionsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'

const SuperadminUserIdParamSchema = z.object({
  superadminUserId: z.string().uuid(),
})

const PermissionCheckParamSchema = z.object({
  superadminUserId: z.string().uuid(),
  permissionId: z.string().uuid(),
})

type TSuperadminUserIdParam = z.infer<typeof SuperadminUserIdParamSchema>
type TPermissionCheckParam = z.infer<typeof PermissionCheckParamSchema>

/**
 * Controller for managing superadmin user permissions.
 *
 * Endpoints:
 * - GET    /                                        List all permissions
 * - GET    /superadmin/:superadminUserId            Get permissions by superadmin user
 * - GET    /check/:superadminUserId/:permissionId   Check if superadmin has permission
 * - GET    /:id                                     Get by ID
 * - POST   /                                        Assign permission
 * - DELETE /:id                                     Remove permission (hard delete)
 * - DELETE /superadmin/:superadminUserId/:permissionId  Remove by superadmin and permission
 */
export class SuperadminUserPermissionsController extends BaseController<
  TSuperadminUserPermission,
  TSuperadminUserPermissionCreate,
  Partial<TSuperadminUserPermissionCreate>
> {
  constructor(repository: SuperadminUserPermissionsRepository) {
    super(repository)
    this.getBySuperadminUserId = this.getBySuperadminUserId.bind(this)
    this.checkHasPermission = this.checkHasPermission.bind(this)
    this.deleteByPermissionId = this.deleteByPermissionId.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware] },
      {
        method: 'get',
        path: '/superadmin/:superadminUserId',
        handler: this.getBySuperadminUserId,
        middlewares: [authMiddleware, paramsValidator(SuperadminUserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/check/:superadminUserId/:permissionId',
        handler: this.checkHasPermission,
        middlewares: [authMiddleware, paramsValidator(PermissionCheckParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, bodyValidator(superadminUserPermissionCreateSchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
      {
        method: 'delete',
        path: '/superadmin/:superadminUserId/:permissionId',
        handler: this.deleteByPermissionId,
        middlewares: [authMiddleware, paramsValidator(PermissionCheckParamSchema)],
      },
    ]
  }

  private async getBySuperadminUserId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TSuperadminUserIdParam>(c)
    const repo = this.repository as SuperadminUserPermissionsRepository

    try {
      const permissions = await repo.getBySuperadminUserId(ctx.params.superadminUserId)
      return ctx.ok({ data: permissions })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async checkHasPermission(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TPermissionCheckParam>(c)
    const repo = this.repository as SuperadminUserPermissionsRepository

    try {
      const hasPermission = await repo.hasPermission(
        ctx.params.superadminUserId,
        ctx.params.permissionId
      )
      return ctx.ok({ data: { hasPermission } })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async deleteByPermissionId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TPermissionCheckParam>(c)
    const repo = this.repository as SuperadminUserPermissionsRepository

    try {
      const success = await repo.deleteByPermissionId(
        ctx.params.superadminUserId,
        ctx.params.permissionId
      )

      if (!success) {
        return ctx.notFound({ error: 'Permission assignment not found' })
      }

      return ctx.noContent()
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
