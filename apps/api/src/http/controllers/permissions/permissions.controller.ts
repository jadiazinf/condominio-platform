import type { Context } from 'hono'
import {
  permissionCreateSchema,
  permissionUpdateSchema,
  type TPermission,
  type TPermissionCreate,
  type TPermissionUpdate,
} from '@packages/domain'
import type { PermissionsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'

const ModuleParamSchema = z.object({
  module: z.string().min(1),
})

type TModuleParam = z.infer<typeof ModuleParamSchema>

const ModuleAndActionParamSchema = z.object({
  module: z.string().min(1),
  action: z.string().min(1),
})

type TModuleAndActionParam = z.infer<typeof ModuleAndActionParamSchema>

/**
 * Controller for managing permission resources.
 *
 * Endpoints:
 * - GET    /                           List all permissions
 * - GET    /module/:module             Get by module
 * - GET    /module/:module/action/:action  Get by module and action
 * - GET    /:id                        Get by ID
 * - POST   /                           Create permission
 * - PATCH  /:id                        Update permission
 * - DELETE /:id                        Delete permission (hard delete)
 */
export class PermissionsController extends BaseController<
  TPermission,
  TPermissionCreate,
  TPermissionUpdate
> {
  constructor(repository: PermissionsRepository) {
    super(repository)
    this.getByModule = this.getByModule.bind(this)
    this.getByModuleAndAction = this.getByModuleAndAction.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list },
      {
        method: 'get',
        path: '/module/:module',
        handler: this.getByModule,
        middlewares: [paramsValidator(ModuleParamSchema)],
      },
      {
        method: 'get',
        path: '/module/:module/action/:action',
        handler: this.getByModuleAndAction,
        middlewares: [paramsValidator(ModuleAndActionParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [bodyValidator(permissionCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(permissionUpdateSchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private async getByModule(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TModuleParam>(c)
    const repo = this.repository as PermissionsRepository

    try {
      const permissions = await repo.getByModule(ctx.params.module)
      return ctx.ok({ data: permissions })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByModuleAndAction(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TModuleAndActionParam>(c)
    const repo = this.repository as PermissionsRepository

    try {
      const permission = await repo.getByModuleAndAction(ctx.params.module, ctx.params.action)

      if (!permission) {
        return ctx.notFound({ error: 'Permission not found' })
      }

      return ctx.ok({ data: permission })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
