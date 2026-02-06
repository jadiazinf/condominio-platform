import type { Context } from 'hono'
import { z } from 'zod'
import type {
  TSubscriptionTermsConditions,
  TSubscriptionTermsConditionsCreate,
  TSubscriptionTermsConditionsUpdate,
} from '@packages/domain'
import type { SubscriptionTermsConditionsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { isUserAuthenticated } from '../../middlewares/utils/auth/is-user-authenticated'
import { isSuperadmin } from '../../middlewares/utils/auth/is-superadmin'
import { requireSuperadminPermission } from '../../middlewares/utils/auth/has-superadmin-permission'

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
 * - GET  /subscription-terms/active        Get current active terms (public)
 * - GET  /subscription-terms/:version      Get terms by version (public)
 * - GET  /subscription-terms               List all terms (superadmin)
 * - POST /subscription-terms               Create new terms version (superadmin)
 * - PATCH /subscription-terms/:id/deactivate  Deactivate terms (superadmin)
 */
export class SubscriptionTermsConditionsController extends BaseController<
  TSubscriptionTermsConditions,
  TSubscriptionTermsConditionsCreate,
  TSubscriptionTermsConditionsUpdate
> {
  constructor(repository: SubscriptionTermsConditionsRepository) {
    super(repository)

    this.getActiveTerms = this.getActiveTerms.bind(this)
    this.getByVersion = this.getByVersion.bind(this)
    this.getAllTerms = this.getAllTerms.bind(this)
    this.createTerms = this.createTerms.bind(this)
    this.deactivateTerms = this.deactivateTerms.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      // Public: Get active terms
      {
        method: 'get',
        path: '/subscription-terms/active',
        handler: this.getActiveTerms,
        middlewares: [],
      },
      // Public: Get terms by version
      {
        method: 'get',
        path: '/subscription-terms/version/:version',
        handler: this.getByVersion,
        middlewares: [paramsValidator(VersionParamSchema)],
      },
      // Superadmin: List all terms
      {
        method: 'get',
        path: '/subscription-terms',
        handler: this.getAllTerms,
        middlewares: [
          isUserAuthenticated,
          isSuperadmin,
          queryValidator(TermsQuerySchema),
        ],
      },
      // Superadmin with manage permission: Create new terms
      {
        method: 'post',
        path: '/subscription-terms',
        handler: this.createTerms,
        middlewares: [
          isUserAuthenticated,
          isSuperadmin,
          requireSuperadminPermission('platform_management_companies', 'manage'),
          bodyValidator(CreateTermsSchema),
        ],
      },
      // Superadmin with manage permission: Deactivate terms
      {
        method: 'patch',
        path: '/subscription-terms/:id/deactivate',
        handler: this.deactivateTerms,
        middlewares: [
          isUserAuthenticated,
          isSuperadmin,
          requireSuperadminPermission('platform_management_companies', 'manage'),
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
  private async getActiveTerms(c: Context): Promise<Response> {
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
   * Get terms by version (public)
   */
  private async getByVersion(c: Context): Promise<Response> {
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
  private async getAllTerms(c: Context): Promise<Response> {
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
   * Create new terms version (superadmin only)
   */
  private async createTerms(c: Context): Promise<Response> {
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
   * Deactivate terms version (superadmin only)
   */
  private async deactivateTerms(c: Context): Promise<Response> {
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
