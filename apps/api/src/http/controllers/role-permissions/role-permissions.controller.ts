import type { Context } from 'hono'
import {
  rolePermissionCreateSchema,
  rolePermissionUpdateSchema,
  type TRolePermission,
  type TRolePermissionCreate,
  type TRolePermissionUpdate,
} from '@packages/domain'
import type { RolePermissionsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'

const RoleIdParamSchema = z.object({
  roleId: z.string().uuid('Invalid role ID format'),
})

type TRoleIdParam = z.infer<typeof RoleIdParamSchema>

const PermissionIdParamSchema = z.object({
  permissionId: z.string().uuid('Invalid permission ID format'),
})

type TPermissionIdParam = z.infer<typeof PermissionIdParamSchema>

const RoleAndPermissionParamSchema = z.object({
  roleId: z.string().uuid('Invalid role ID format'),
  permissionId: z.string().uuid('Invalid permission ID format'),
})

type TRoleAndPermissionParam = z.infer<typeof RoleAndPermissionParamSchema>

/**
 * Controller for managing role-permission assignments.
 *
 * Endpoints:
 * - GET    /                                  List all role-permissions
 * - GET    /role/:roleId                      Get by role
 * - GET    /permission/:permissionId          Get by permission
 * - GET    /role/:roleId/permission/:permissionId/exists  Check if exists
 * - GET    /:id                               Get by ID
 * - POST   /                                  Create role-permission
 * - PATCH  /:id                               Update role-permission
 * - DELETE /:id                               Delete role-permission (hard delete)
 * - DELETE /role/:roleId/permission/:permissionId  Delete by role and permission
 */
export class RolePermissionsController extends BaseController<
  TRolePermission,
  TRolePermissionCreate,
  TRolePermissionUpdate
> {
  constructor(repository: RolePermissionsRepository) {
    super(repository)
    this.getByRoleId = this.getByRoleId.bind(this)
    this.getByPermissionId = this.getByPermissionId.bind(this)
    this.checkExists = this.checkExists.bind(this)
    this.removeByRoleAndPermission = this.removeByRoleAndPermission.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list },
      {
        method: 'get',
        path: '/role/:roleId',
        handler: this.getByRoleId,
        middlewares: [paramsValidator(RoleIdParamSchema)],
      },
      {
        method: 'get',
        path: '/permission/:permissionId',
        handler: this.getByPermissionId,
        middlewares: [paramsValidator(PermissionIdParamSchema)],
      },
      {
        method: 'get',
        path: '/role/:roleId/permission/:permissionId/exists',
        handler: this.checkExists,
        middlewares: [paramsValidator(RoleAndPermissionParamSchema)],
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
        middlewares: [bodyValidator(rolePermissionCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(rolePermissionUpdateSchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [paramsValidator(IdParamSchema)],
      },
      {
        method: 'delete',
        path: '/role/:roleId/permission/:permissionId',
        handler: this.removeByRoleAndPermission,
        middlewares: [paramsValidator(RoleAndPermissionParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private async getByRoleId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TRoleIdParam>(c)
    const repo = this.repository as RolePermissionsRepository

    try {
      const rolePermissions = await repo.getByRoleId(ctx.params.roleId)
      return ctx.ok({ data: rolePermissions })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByPermissionId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TPermissionIdParam>(c)
    const repo = this.repository as RolePermissionsRepository

    try {
      const rolePermissions = await repo.getByPermissionId(ctx.params.permissionId)
      return ctx.ok({ data: rolePermissions })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async checkExists(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TRoleAndPermissionParam>(c)
    const repo = this.repository as RolePermissionsRepository

    try {
      const exists = await repo.exists(ctx.params.roleId, ctx.params.permissionId)
      return ctx.ok({ data: { exists } })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async removeByRoleAndPermission(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TRoleAndPermissionParam>(c)
    const repo = this.repository as RolePermissionsRepository

    try {
      const success = await repo.removeByRoleAndPermission(
        ctx.params.roleId,
        ctx.params.permissionId
      )

      if (!success) {
        return ctx.notFound({ error: 'Role-permission assignment not found' })
      }

      return ctx.noContent()
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
