import type { Context } from 'hono'
import { z } from 'zod'
import {
  type TSubscriptionTermsConditions,
  type TSubscriptionTermsConditionsCreate,
  type TSubscriptionTermsConditionsUpdate,
  ESystemRole,
} from '@packages/domain'
import type { SubscriptionTermsConditionsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { isUserAuthenticated } from '../../middlewares/utils/auth/is-user-authenticated'
import { requireRole } from '../../middlewares/auth'

const VersionParamSchema = z.object({
  version: z.string().min(1, 'Version is required'),
})

type TVersionParam = z.infer<typeof VersionParamSchema>

const CreateTermsSchema = z.object({
  version: z.string().max(50),
  title: z.string().max(255),
  content: z.string(),
  summary: z.string().optional(),
  effectiveFrom: z.coerce.date(),
  effectiveUntil: z.coerce.date().optional(),
  isActive: z.boolean().optional().default(true),
  createdBy: z.string().uuid().optional(),
})

type TCreateTermsBody = z.infer<typeof CreateTermsSchema>

const UpdateTermsSchema = z.object({
  title: z.string().max(255).optional(),
  content: z.string().optional(),
  summary: z.string().optional(),
  effectiveFrom: z.coerce.date().optional(),
  effectiveUntil: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
})

type TUpdateTermsBody = z.infer<typeof UpdateTermsSchema>

const TermsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  isActive: z.coerce.boolean().optional(),
})

type TTermsQuery = z.infer<typeof TermsQuerySchema>

/**
 * Controller for managing subscription terms and conditions.
 *
 * Endpoints:
 * - GET  /active                Get current active terms (public)
 * - GET  /version/:version      Get terms by version (superadmin)
 * - GET  /                      List all terms (superadmin)
 * - GET  /:id                   Get terms by ID (superadmin)
 * - POST /                      Create new terms version (superadmin)
 * - PATCH /:id                  Update terms (superadmin)
 * - PATCH /:id/deactivate       Deactivate terms (superadmin)
 */
export class SubscriptionTermsConditionsController extends BaseController<
  TSubscriptionTermsConditions,
  TSubscriptionTermsConditionsCreate,
  TSubscriptionTermsConditionsUpdate
> {
  constructor(repository: SubscriptionTermsConditionsRepository) {
    super(repository)
  }

  get routes(): TRouteDefinition[] {
    return [
      // Public: Get active terms
      {
        method: 'get',
        path: '/active',
        handler: this.getActiveTerms,
        middlewares: [],
      },
      // Superadmin: Get terms by version
      {
        method: 'get',
        path: '/version/:version',
        handler: this.getByVersion,
        middlewares: [isUserAuthenticated, requireRole(ESystemRole.SUPERADMIN), paramsValidator(VersionParamSchema)],
      },
      // Superadmin: List all terms
      {
        method: 'get',
        path: '/',
        handler: this.getAllTerms,
        middlewares: [
          isUserAuthenticated,
          requireRole(ESystemRole.SUPERADMIN),
          queryValidator(TermsQuerySchema),
        ],
      },
      // Superadmin: Get terms by ID
      {
        method: 'get',
        path: '/:id',
        handler: this.getTermsById,
        middlewares: [
          isUserAuthenticated,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(IdParamSchema),
        ],
      },
      // Superadmin: Create new terms
      {
        method: 'post',
        path: '/',
        handler: this.createTerms,
        middlewares: [
          isUserAuthenticated,
          requireRole(ESystemRole.SUPERADMIN),
          bodyValidator(CreateTermsSchema),
        ],
      },
      // Superadmin: Update terms
      {
        method: 'patch',
        path: '/:id',
        handler: this.updateTerms,
        middlewares: [
          isUserAuthenticated,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(IdParamSchema),
          bodyValidator(UpdateTermsSchema),
        ],
      },
      // Superadmin: Deactivate terms
      {
        method: 'patch',
        path: '/:id/deactivate',
        handler: this.deactivateTerms,
        middlewares: [
          isUserAuthenticated,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(IdParamSchema),
        ],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get current active terms and conditions (public)
   */
  private getActiveTerms = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const repo = this.repository as SubscriptionTermsConditionsRepository

    try {
      const terms = await repo.getActiveTerms()

      if (!terms) {
        return ctx.notFound({ error: 'No active terms and conditions found' })
      }

      return ctx.ok({ data: terms })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * Get terms by version (superadmin)
   */
  private getByVersion = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TVersionParam>(c)
    const repo = this.repository as SubscriptionTermsConditionsRepository

    try {
      const terms = await repo.getByVersion(ctx.params.version)

      if (!terms) {
        return ctx.notFound({ error: 'Terms version not found' })
      }

      return ctx.ok({ data: terms })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * List all terms with pagination (superadmin only)
   */
  private getAllTerms = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TTermsQuery>(c)
    const repo = this.repository as SubscriptionTermsConditionsRepository

    try {
      const result = await repo.getAllPaginated({
        page: ctx.query.page,
        limit: ctx.query.limit,
        isActive: ctx.query.isActive,
      })

      return ctx.ok(result)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * Get terms by ID (superadmin only)
   */
  private getTermsById = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const repo = this.repository as SubscriptionTermsConditionsRepository

    try {
      const terms = await repo.getById(ctx.params.id)

      if (!terms) {
        return ctx.notFound({ error: 'Terms not found' })
      }

      return ctx.ok({ data: terms })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * Create new terms version (superadmin only)
   */
  private createTerms = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TCreateTermsBody>(c)
    const repo = this.repository as SubscriptionTermsConditionsRepository

    try {
      // Check if version already exists
      const existing = await repo.getByVersion(ctx.body.version)
      if (existing) {
        return ctx.badRequest({ error: `Terms version '${ctx.body.version}' already exists` })
      }

      const terms = await repo.create({
        version: ctx.body.version,
        title: ctx.body.title,
        content: ctx.body.content,
        summary: ctx.body.summary ?? null,
        effectiveFrom: ctx.body.effectiveFrom,
        effectiveUntil: ctx.body.effectiveUntil ?? null,
        isActive: ctx.body.isActive ?? true,
        createdBy: ctx.body.createdBy ?? null,
      })

      return ctx.created({ data: terms })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * Update terms (superadmin only)
   */
  private updateTerms = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TUpdateTermsBody, unknown, { id: string }>(c)
    const repo = this.repository as SubscriptionTermsConditionsRepository

    try {
      const existing = await repo.getById(ctx.params.id)
      if (!existing) {
        return ctx.notFound({ error: 'Terms not found' })
      }

      const terms = await repo.update(ctx.params.id, ctx.body)

      return ctx.ok({ data: terms })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * Deactivate terms version (superadmin only)
   */
  private deactivateTerms = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const repo = this.repository as SubscriptionTermsConditionsRepository

    try {
      const terms = await repo.deactivate(ctx.params.id)

      if (!terms) {
        return ctx.notFound({ error: 'Terms not found' })
      }

      return ctx.ok({ data: terms, message: 'Terms deactivated successfully' })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
