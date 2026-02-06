import type { Context } from 'hono'
import { z } from 'zod'
import type {
  TSubscriptionRate,
  TSubscriptionRateCreate,
  TSubscriptionRateUpdate,
} from '@packages/domain'
import type { SubscriptionRatesRepository } from '@database/repositories'
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

const CreateRateSchema = z.object({
  name: z.string().max(100),
  description: z.string().optional(),
  condominiumRate: z.number().nonnegative(),
  unitRate: z.number().nonnegative(),
  userRate: z.number().nonnegative().optional().default(0),
  annualDiscountPercentage: z.number().nonnegative().max(100).optional().default(0),
  version: z.string().max(50),
  isActive: z.boolean().optional().default(false),
  effectiveFrom: z.coerce.date(),
  effectiveUntil: z.coerce.date().optional(),
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional(),
})

type TCreateRateBody = z.infer<typeof CreateRateSchema>

const UpdateRateSchema = z.object({
  name: z.string().max(100).optional(),
  description: z.string().optional(),
  condominiumRate: z.number().nonnegative().optional(),
  unitRate: z.number().nonnegative().optional(),
  userRate: z.number().nonnegative().optional(),
  annualDiscountPercentage: z.number().nonnegative().max(100).optional(),
  isActive: z.boolean().optional(),
  effectiveFrom: z.coerce.date().optional(),
  effectiveUntil: z.coerce.date().optional(),
  updatedBy: z.string().uuid().optional(),
})

type TUpdateRateBody = z.infer<typeof UpdateRateSchema>

const RatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  isActive: z.coerce.boolean().optional(),
})

type TRatesQuery = z.infer<typeof RatesQuerySchema>

/**
 * Controller for managing subscription rates.
 *
 * Endpoints:
 * - GET  /subscription-rates/active        Get current active rate (public)
 * - GET  /subscription-rates/version/:version  Get rate by version (superadmin)
 * - GET  /subscription-rates               List all rates (superadmin)
 * - GET  /subscription-rates/:id           Get rate by ID (superadmin)
 * - POST /subscription-rates               Create new rate (superadmin + manage)
 * - PATCH /subscription-rates/:id          Update rate (superadmin + manage)
 * - PATCH /subscription-rates/:id/activate Activate rate (superadmin + manage)
 * - PATCH /subscription-rates/:id/deactivate Deactivate rate (superadmin + manage)
 */
export class SubscriptionRatesController extends BaseController<
  TSubscriptionRate,
  TSubscriptionRateCreate,
  TSubscriptionRateUpdate
> {
  constructor(repository: SubscriptionRatesRepository) {
    super(repository)

    this.getActiveRate = this.getActiveRate.bind(this)
    this.getByVersion = this.getByVersion.bind(this)
    this.getAllRates = this.getAllRates.bind(this)
    this.getRateById = this.getRateById.bind(this)
    this.createRate = this.createRate.bind(this)
    this.updateRate = this.updateRate.bind(this)
    this.activateRate = this.activateRate.bind(this)
    this.deactivateRate = this.deactivateRate.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      // Public: Get active rate
      {
        method: 'get',
        path: '/subscription-rates/active',
        handler: this.getActiveRate,
        middlewares: [],
      },
      // Superadmin: Get rate by version
      {
        method: 'get',
        path: '/subscription-rates/version/:version',
        handler: this.getByVersion,
        middlewares: [
          isUserAuthenticated,
          isSuperadmin,
          paramsValidator(VersionParamSchema),
        ],
      },
      // Superadmin: List all rates
      {
        method: 'get',
        path: '/subscription-rates',
        handler: this.getAllRates,
        middlewares: [
          isUserAuthenticated,
          isSuperadmin,
          queryValidator(RatesQuerySchema),
        ],
      },
      // Superadmin: Get rate by ID
      {
        method: 'get',
        path: '/subscription-rates/:id',
        handler: this.getRateById,
        middlewares: [
          isUserAuthenticated,
          isSuperadmin,
          paramsValidator(IdParamSchema),
        ],
      },
      // Superadmin with manage permission: Create new rate
      {
        method: 'post',
        path: '/subscription-rates',
        handler: this.createRate,
        middlewares: [
          isUserAuthenticated,
          isSuperadmin,
          requireSuperadminPermission('platform_management_companies', 'manage'),
          bodyValidator(CreateRateSchema),
        ],
      },
      // Superadmin with manage permission: Update rate
      {
        method: 'patch',
        path: '/subscription-rates/:id',
        handler: this.updateRate,
        middlewares: [
          isUserAuthenticated,
          isSuperadmin,
          requireSuperadminPermission('platform_management_companies', 'manage'),
          paramsValidator(IdParamSchema),
          bodyValidator(UpdateRateSchema),
        ],
      },
      // Superadmin with manage permission: Activate rate
      {
        method: 'patch',
        path: '/subscription-rates/:id/activate',
        handler: this.activateRate,
        middlewares: [
          isUserAuthenticated,
          isSuperadmin,
          requireSuperadminPermission('platform_management_companies', 'manage'),
          paramsValidator(IdParamSchema),
        ],
      },
      // Superadmin with manage permission: Deactivate rate
      {
        method: 'patch',
        path: '/subscription-rates/:id/deactivate',
        handler: this.deactivateRate,
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
   * Get current active subscription rate (public)
   */
  private async getActiveRate(c: Context): Promise<Response> {
    const ctx = this.ctx(c)
    const repo = this.repository as SubscriptionRatesRepository

    try {
      const rate = await repo.getActiveRate()

      if (!rate) {
        return ctx.notFound({ error: 'No active subscription rate found' })
      }

      return ctx.ok({ data: rate })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * Get rate by version (superadmin only)
   */
  private async getByVersion(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TVersionParam>(c)
    const repo = this.repository as SubscriptionRatesRepository

    try {
      const rate = await repo.getByVersion(ctx.params.version)

      if (!rate) {
        return ctx.notFound({ error: 'Rate version not found' })
      }

      return ctx.ok({ data: rate })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * List all rates with pagination (superadmin only)
   */
  private async getAllRates(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TRatesQuery>(c)
    const repo = this.repository as SubscriptionRatesRepository

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
   * Get rate by ID (superadmin only)
   */
  private async getRateById(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const repo = this.repository as SubscriptionRatesRepository

    try {
      const rate = await repo.getById(ctx.params.id)

      if (!rate) {
        return ctx.notFound({ error: 'Rate not found' })
      }

      return ctx.ok({ data: rate })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * Create new rate (superadmin only)
   */
  private async createRate(c: Context): Promise<Response> {
    const ctx = this.ctx<TCreateRateBody>(c)
    const repo = this.repository as SubscriptionRatesRepository

    try {
      // Check if version already exists
      const existing = await repo.getByVersion(ctx.body.version)
      if (existing) {
        return ctx.badRequest({ error: `Rate version '${ctx.body.version}' already exists` })
      }

      const rate = await repo.create({
        name: ctx.body.name,
        description: ctx.body.description ?? null,
        condominiumRate: ctx.body.condominiumRate,
        unitRate: ctx.body.unitRate,
        userRate: ctx.body.userRate ?? 0,
        annualDiscountPercentage: ctx.body.annualDiscountPercentage ?? 0,
        minCondominiums: 1,
        maxCondominiums: null,
        version: ctx.body.version,
        isActive: ctx.body.isActive ?? false,
        effectiveFrom: ctx.body.effectiveFrom,
        effectiveUntil: ctx.body.effectiveUntil ?? null,
        createdBy: ctx.body.createdBy ?? null,
        updatedBy: ctx.body.updatedBy ?? null,
      })

      return ctx.created({ data: rate })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * Update rate (superadmin only)
   */
  private async updateRate(c: Context): Promise<Response> {
    const ctx = this.ctx<TUpdateRateBody, unknown, { id: string }>(c)
    const repo = this.repository as SubscriptionRatesRepository

    try {
      // Check rate exists
      const existing = await repo.getById(ctx.params.id)
      if (!existing) {
        return ctx.notFound({ error: 'Rate not found' })
      }

      const rate = await repo.update(ctx.params.id, {
        name: ctx.body.name,
        description: ctx.body.description,
        condominiumRate: ctx.body.condominiumRate,
        unitRate: ctx.body.unitRate,
        isActive: ctx.body.isActive,
        effectiveFrom: ctx.body.effectiveFrom,
        effectiveUntil: ctx.body.effectiveUntil,
        updatedBy: ctx.body.updatedBy,
      })

      return ctx.ok({ data: rate })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * Activate rate (superadmin only) - deactivates all other rates
   */
  private async activateRate(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const repo = this.repository as SubscriptionRatesRepository

    try {
      // Get userId from context for audit
      const userId = c.get('userId') as string | undefined

      const rate = await repo.activate(ctx.params.id, userId ?? '')

      if (!rate) {
        return ctx.notFound({ error: 'Rate not found' })
      }

      return ctx.ok({ data: rate, message: 'Rate activated successfully' })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * Deactivate rate (superadmin only)
   */
  private async deactivateRate(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const repo = this.repository as SubscriptionRatesRepository

    try {
      // Get userId from context for audit
      const userId = c.get('userId') as string | undefined

      const rate = await repo.deactivate(ctx.params.id, userId ?? '')

      if (!rate) {
        return ctx.notFound({ error: 'Rate not found' })
      }

      return ctx.ok({ data: rate, message: 'Rate deactivated successfully' })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
