import type { Context } from 'hono'
import {
  quotaAdjustmentCreateSchema,
  EAdjustmentTypes,
  type TQuotaAdjustment,
  type TQuotaAdjustmentCreate,
} from '@packages/domain'
import type { QuotasRepository, QuotaAdjustmentsRepository } from '@database/repositories'
import { HttpContext } from '../../context'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { createRouter } from '../create-router'
import { z } from 'zod'
import { AUTHENTICATED_USER_PROP } from '../../middlewares/utils/auth/is-user-authenticated'
import {
  AdjustQuotaService,
  GetAdjustmentsByQuotaService,
  GetAdjustmentsByUserService,
  GetAdjustmentsByTypeService,
} from '@src/services/quota-adjustments'

const QuotaIdParamSchema = z.object({
  quotaId: z.string().uuid('Invalid quota ID format'),
})

type TQuotaIdParam = z.infer<typeof QuotaIdParamSchema>

const UserIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
})

type TUserIdParam = z.infer<typeof UserIdParamSchema>

const AdjustmentTypeParamSchema = z.object({
  type: z.enum(EAdjustmentTypes),
})

type TAdjustmentTypeParam = z.infer<typeof AdjustmentTypeParamSchema>

// Schema for the adjust quota endpoint (without createdBy, it comes from auth)
const AdjustQuotaBodySchema = z.object({
  newAmount: z.string(),
  adjustmentType: z.enum(EAdjustmentTypes),
  reason: z.string().min(10),
})

type TAdjustQuotaBody = z.infer<typeof AdjustQuotaBodySchema>

type TIdParam = z.infer<typeof IdParamSchema>

/**
 * Controller for managing quota adjustments.
 *
 * Endpoints:
 * - GET    /                         List all adjustments
 * - GET    /quota/:quotaId           Get adjustments for a quota
 * - GET    /user/:userId             Get adjustments by user
 * - GET    /type/:type               Get adjustments by type
 * - GET    /:id                      Get adjustment by ID
 * - POST   /quota/:quotaId           Adjust a quota (creates adjustment + updates quota)
 */
export class QuotaAdjustmentsController {
  private readonly adjustQuotaService: AdjustQuotaService
  private readonly getAdjustmentsByQuotaService: GetAdjustmentsByQuotaService
  private readonly getAdjustmentsByUserService: GetAdjustmentsByUserService
  private readonly getAdjustmentsByTypeService: GetAdjustmentsByTypeService

  constructor(
    private readonly quotasRepository: QuotasRepository,
    private readonly quotaAdjustmentsRepository: QuotaAdjustmentsRepository
  ) {
    // Initialize services
    this.adjustQuotaService = new AdjustQuotaService(quotasRepository, quotaAdjustmentsRepository)
    this.getAdjustmentsByQuotaService = new GetAdjustmentsByQuotaService(quotaAdjustmentsRepository)
    this.getAdjustmentsByUserService = new GetAdjustmentsByUserService(quotaAdjustmentsRepository)
    this.getAdjustmentsByTypeService = new GetAdjustmentsByTypeService(quotaAdjustmentsRepository)

    // Bind handlers
    this.list = this.list.bind(this)
    this.getById = this.getById.bind(this)
    this.getByQuotaId = this.getByQuotaId.bind(this)
    this.getByUserId = this.getByUserId.bind(this)
    this.getByType = this.getByType.bind(this)
    this.adjustQuota = this.adjustQuota.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware] },
      {
        method: 'get',
        path: '/quota/:quotaId',
        handler: this.getByQuotaId,
        middlewares: [authMiddleware, paramsValidator(QuotaIdParamSchema)],
      },
      {
        method: 'get',
        path: '/user/:userId',
        handler: this.getByUserId,
        middlewares: [authMiddleware, paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/type/:type',
        handler: this.getByType,
        middlewares: [authMiddleware, paramsValidator(AdjustmentTypeParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/quota/:quotaId',
        handler: this.adjustQuota,
        middlewares: [
          authMiddleware,
          paramsValidator(QuotaIdParamSchema),
          bodyValidator(AdjustQuotaBodySchema),
        ],
      },
    ]
  }

  createRouter() {
    return createRouter(this.routes)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private ctx<TBody = unknown, TQuery = unknown, TParams = unknown>(c: Context) {
    return new HttpContext<TBody, TQuery, TParams>(c)
  }

  private async list(c: Context): Promise<Response> {
    const ctx = this.ctx(c)

    try {
      const adjustments = await this.quotaAdjustmentsRepository.listAll()
      return ctx.ok({ data: adjustments })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getById(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TIdParam>(c)

    try {
      const adjustment = await this.quotaAdjustmentsRepository.getById(ctx.params.id)

      if (!adjustment) {
        return ctx.notFound({ error: 'Adjustment not found' })
      }

      return ctx.ok({ data: adjustment })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByQuotaId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TQuotaIdParam>(c)

    try {
      const result = await this.getAdjustmentsByQuotaService.execute({
        quotaId: ctx.params.quotaId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByUserId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)

    try {
      const result = await this.getAdjustmentsByUserService.execute({
        userId: ctx.params.userId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByType(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TAdjustmentTypeParam>(c)

    try {
      const result = await this.getAdjustmentsByTypeService.execute({
        adjustmentType: ctx.params.type,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async adjustQuota(c: Context): Promise<Response> {
    const ctx = this.ctx<TAdjustQuotaBody, unknown, TQuotaIdParam>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    try {
      const result = await this.adjustQuotaService.execute({
        quotaId: ctx.params.quotaId,
        newAmount: ctx.body.newAmount,
        adjustmentType: ctx.body.adjustmentType,
        reason: ctx.body.reason,
        adjustedByUserId: user.id,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        if (result.code === 'BAD_REQUEST') {
          return ctx.badRequest({ error: result.error })
        }
        return ctx.internalError({ error: result.error })
      }

      return ctx.created({ data: result.data.adjustment, message: result.data.message })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ─────────────────────────────────────────────────────────────────────────────

  private handleError(ctx: HttpContext, error: unknown): Response | Promise<Response> {
    console.error('QuotaAdjustmentsController error:', error)
    return ctx.internalError({ error: 'An unexpected error occurred' })
  }
}
