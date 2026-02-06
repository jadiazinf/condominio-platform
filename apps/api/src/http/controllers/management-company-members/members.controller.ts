import type { Context } from 'hono'
import {
  managementCompanyMemberCreateSchema,
  managementCompanyMemberUpdateSchema,
  managementCompanyMembersQuerySchema,
  type TManagementCompanyMember,
  type TManagementCompanyMemberCreate,
  type TManagementCompanyMemberUpdate,
  type TManagementCompanyMembersQuerySchema,
  memberPermissionsSchema,
} from '@packages/domain'
import type { ManagementCompanyMembersRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import {
  AddMemberService,
  UpdateMemberPermissionsService,
} from '../../../services/management-company-members'
import { authMiddleware } from '../../middlewares/auth'
import { AUTHENTICATED_USER_PROP } from '../../middlewares/utils/auth/is-user-authenticated'

const CompanyIdParamSchema = z.object({
  companyId: z.string().uuid('Invalid company ID format'),
})

type TCompanyIdParam = z.infer<typeof CompanyIdParamSchema>

const AddMemberBodySchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'accountant', 'support', 'viewer']),
  permissions: memberPermissionsSchema.optional(),
  isPrimary: z.boolean().optional(),
  invitedBy: z.string().uuid().optional(),
})

type TAddMemberBody = z.infer<typeof AddMemberBodySchema>

const UpdatePermissionsBodySchema = z.object({
  permissions: memberPermissionsSchema,
})

type TUpdatePermissionsBody = z.infer<typeof UpdatePermissionsBodySchema>

const RemoveMemberBodySchema = z.object({
  deactivatedBy: z.string().uuid(),
})

type TRemoveMemberBody = z.infer<typeof RemoveMemberBodySchema>

/**
 * Controller for managing company members.
 *
 * Endpoints:
 * - GET    /management-companies/:companyId/members             Get all members
 * - POST   /management-companies/:companyId/members             Add new member
 * - GET    /management-companies/:companyId/primary-admin       Get primary admin
 * - PATCH  /management-company-members/:id                      Update member
 * - PATCH  /management-company-members/:id/permissions          Update member permissions
 * - DELETE /management-company-members/:id                      Remove member (soft delete)
 */
export class ManagementCompanyMembersController extends BaseController<
  TManagementCompanyMember,
  TManagementCompanyMemberCreate,
  TManagementCompanyMemberUpdate
> {
  private readonly addMemberService: AddMemberService
  private readonly updatePermissionsService: UpdateMemberPermissionsService

  constructor(repository: ManagementCompanyMembersRepository) {
    super(repository)
    this.addMemberService = new AddMemberService(repository)
    this.updatePermissionsService = new UpdateMemberPermissionsService(repository)

    this.getMembersByCompany = this.getMembersByCompany.bind(this)
    this.getPrimaryAdmin = this.getPrimaryAdmin.bind(this)
    this.addMember = this.addMember.bind(this)
    this.updatePermissions = this.updatePermissions.bind(this)
    this.removeMember = this.removeMember.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/management-companies/:companyId/members',
        handler: this.getMembersByCompany,
        middlewares: [
          paramsValidator(CompanyIdParamSchema),
          queryValidator(managementCompanyMembersQuerySchema),
        ],
      },
      {
        method: 'post',
        path: '/management-companies/:companyId/members',
        handler: this.addMember,
        middlewares: [authMiddleware, paramsValidator(CompanyIdParamSchema), bodyValidator(AddMemberBodySchema)],
      },
      {
        method: 'get',
        path: '/management-companies/:companyId/primary-admin',
        handler: this.getPrimaryAdmin,
        middlewares: [paramsValidator(CompanyIdParamSchema)],
      },
      {
        method: 'patch',
        path: '/management-company-members/:id',
        handler: this.update,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(managementCompanyMemberUpdateSchema)],
      },
      {
        method: 'patch',
        path: '/management-company-members/:id/permissions',
        handler: this.updatePermissions,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(UpdatePermissionsBodySchema)],
      },
      {
        method: 'delete',
        path: '/management-company-members/:id',
        handler: this.removeMember,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(RemoveMemberBodySchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private async getMembersByCompany(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TManagementCompanyMembersQuerySchema, TCompanyIdParam>(c)
    const repo = this.repository as ManagementCompanyMembersRepository

    try {
      const result = await repo.listByCompanyIdPaginated(ctx.params.companyId, ctx.query)

      return ctx.ok(result)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getPrimaryAdmin(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TCompanyIdParam>(c)
    const repo = this.repository as ManagementCompanyMembersRepository

    try {
      const primaryAdmin = await repo.getPrimaryAdmin(ctx.params.companyId)

      if (!primaryAdmin) {
        return ctx.notFound({ error: 'Primary admin not found' })
      }

      return ctx.ok({ data: primaryAdmin })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async addMember(c: Context): Promise<Response> {
    const ctx = this.ctx<TAddMemberBody, unknown, TCompanyIdParam>(c)

    // Get authenticated user from middleware
    const authenticatedUser = c.get(AUTHENTICATED_USER_PROP)

    try {
      const result = await this.addMemberService.execute({
        managementCompanyId: ctx.params.companyId,
        userId: ctx.body.userId,
        role: ctx.body.role,
        permissions: ctx.body.permissions,
        isPrimary: ctx.body.isPrimary,
        // Use the authenticated user as invitedBy (fallback to body if provided for backwards compatibility)
        invitedBy: ctx.body.invitedBy ?? authenticatedUser?.id,
      })

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      return ctx.created({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async updatePermissions(c: Context): Promise<Response> {
    const ctx = this.ctx<TUpdatePermissionsBody, unknown, { id: string }>(c)

    try {
      const result = await this.updatePermissionsService.execute({
        memberId: ctx.params.id,
        permissions: ctx.body.permissions,
      })

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async removeMember(c: Context): Promise<Response> {
    const ctx = this.ctx<TRemoveMemberBody, unknown, { id: string }>(c)
    const repo = this.repository as ManagementCompanyMembersRepository

    try {
      const member = await repo.removeMember(ctx.params.id, ctx.body.deactivatedBy)

      if (!member) {
        return ctx.notFound({ error: 'Member not found' })
      }

      return ctx.ok({ data: member })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
