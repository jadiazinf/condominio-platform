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
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
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
 * - GET    /name/:name    Get by name
 * - GET    /:id           Get by ID
 * - POST   /              Create role
 * - PATCH  /:id           Update role
 * - DELETE /:id           Delete role (hard delete)
 */
export class RolesController extends BaseController<TRole, TRoleCreate, TRoleUpdate> {
  constructor(repository: RolesRepository) {
    super(repository)
    this.getByName = this.getByName.bind(this)
    this.getSystemRoles = this.getSystemRoles.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list },
      { method: 'get', path: '/system', handler: this.getSystemRoles },
      {
        method: 'get',
        path: '/name/:name',
        handler: this.getByName,
        middlewares: [paramsValidator(NameParamSchema)],
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
        middlewares: [bodyValidator(roleCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(roleUpdateSchema)],
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

  private async getByName(c: Context): Promise<Response> {
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

  private async getSystemRoles(c: Context): Promise<Response> {
    const ctx = this.ctx(c)
    const repo = this.repository as RolesRepository

    try {
      const roles = await repo.getSystemRoles()
      return ctx.ok({ data: roles })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
