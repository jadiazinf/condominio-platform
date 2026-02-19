import type { Context } from 'hono'
import {
  paymentConceptCreateSchema,
  paymentConceptUpdateSchema,
  type TPaymentConcept,
  type TPaymentConceptCreate,
  type TPaymentConceptUpdate,
  ESystemRole,
} from '@packages/domain'
import type { PaymentConceptsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'

const BuildingIdParamSchema = z.object({
  buildingId: z.string().uuid('Invalid building ID format'),
})

type TBuildingIdParam = z.infer<typeof BuildingIdParamSchema>

const ConceptTypeParamSchema = z.object({
  conceptType: z.string().min(1),
})

type TConceptTypeParam = z.infer<typeof ConceptTypeParamSchema>

/**
 * Controller for managing payment concept resources.
 * List is scoped by condominiumId from the requireRole middleware context.
 *
 * Endpoints:
 * - GET    /                              List payment concepts (scoped by condominium)
 * - GET    /recurring                     Get recurring concepts
 * - GET    /building/:buildingId          Get by building
 * - GET    /type/:conceptType             Get by concept type
 * - GET    /:id                           Get by ID
 * - POST   /                              Create payment concept
 * - PATCH  /:id                           Update payment concept
 * - DELETE /:id                           Delete payment concept
 */
export class PaymentConceptsController extends BaseController<
  TPaymentConcept,
  TPaymentConceptCreate,
  TPaymentConceptUpdate
> {
  constructor(repository: PaymentConceptsRepository) {
    super(repository)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT)] },
      { method: 'get', path: '/recurring', handler: this.getRecurringConcepts, middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT)] },
      {
        method: 'get',
        path: '/building/:buildingId',
        handler: this.getByBuildingId,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), paramsValidator(BuildingIdParamSchema)],
      },
      {
        method: 'get',
        path: '/type/:conceptType',
        handler: this.getByConceptType,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), paramsValidator(ConceptTypeParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN), bodyValidator(paymentConceptCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN), paramsValidator(IdParamSchema), bodyValidator(paymentConceptUpdateSchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN), paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  protected override list = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const repo = this.repository as PaymentConceptsRepository

    const concepts = await repo.getByCondominiumId(condominiumId)
    return ctx.ok({ data: concepts })
  }

  private getByBuildingId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TBuildingIdParam>(c)
    const repo = this.repository as PaymentConceptsRepository

    try {
      const concepts = await repo.getByBuildingId(ctx.params.buildingId)
      return ctx.ok({ data: concepts })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getRecurringConcepts = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const repo = this.repository as PaymentConceptsRepository

    try {
      const concepts = await repo.getRecurringConcepts()
      return ctx.ok({ data: concepts })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByConceptType = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TConceptTypeParam>(c)
    const repo = this.repository as PaymentConceptsRepository

    try {
      const concepts = await repo.getByConceptType(
        ctx.params.conceptType as TPaymentConcept['conceptType']
      )
      return ctx.ok({ data: concepts })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
