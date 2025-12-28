import type { Context } from 'hono'
import {
  paymentConceptCreateSchema,
  paymentConceptUpdateSchema,
  type TPaymentConcept,
  type TPaymentConceptCreate,
  type TPaymentConceptUpdate,
} from '@packages/domain'
import type { PaymentConceptsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'

const CondominiumIdParamSchema = z.object({
  condominiumId: z.string().uuid('Invalid condominium ID format'),
})

type TCondominiumIdParam = z.infer<typeof CondominiumIdParamSchema>

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
 *
 * Endpoints:
 * - GET    /                              List all payment concepts
 * - GET    /recurring                     Get recurring concepts
 * - GET    /condominium/:condominiumId    Get by condominium
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
    this.getByCondominiumId = this.getByCondominiumId.bind(this)
    this.getByBuildingId = this.getByBuildingId.bind(this)
    this.getRecurringConcepts = this.getRecurringConcepts.bind(this)
    this.getByConceptType = this.getByConceptType.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list },
      { method: 'get', path: '/recurring', handler: this.getRecurringConcepts },
      {
        method: 'get',
        path: '/condominium/:condominiumId',
        handler: this.getByCondominiumId,
        middlewares: [paramsValidator(CondominiumIdParamSchema)],
      },
      {
        method: 'get',
        path: '/building/:buildingId',
        handler: this.getByBuildingId,
        middlewares: [paramsValidator(BuildingIdParamSchema)],
      },
      {
        method: 'get',
        path: '/type/:conceptType',
        handler: this.getByConceptType,
        middlewares: [paramsValidator(ConceptTypeParamSchema)],
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
        middlewares: [bodyValidator(paymentConceptCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(paymentConceptUpdateSchema)],
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

  private async getByCondominiumId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TCondominiumIdParam>(c)
    const repo = this.repository as PaymentConceptsRepository

    try {
      const concepts = await repo.getByCondominiumId(ctx.params.condominiumId)
      return ctx.ok({ data: concepts })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByBuildingId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TBuildingIdParam>(c)
    const repo = this.repository as PaymentConceptsRepository

    try {
      const concepts = await repo.getByBuildingId(ctx.params.buildingId)
      return ctx.ok({ data: concepts })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getRecurringConcepts(c: Context): Promise<Response> {
    const ctx = this.ctx(c)
    const repo = this.repository as PaymentConceptsRepository

    try {
      const concepts = await repo.getRecurringConcepts()
      return ctx.ok({ data: concepts })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByConceptType(c: Context): Promise<Response> {
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
