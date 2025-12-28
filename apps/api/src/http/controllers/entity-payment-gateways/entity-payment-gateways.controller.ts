import type { Context } from 'hono'
import {
  entityPaymentGatewayCreateSchema,
  entityPaymentGatewayUpdateSchema,
  type TEntityPaymentGateway,
  type TEntityPaymentGatewayCreate,
  type TEntityPaymentGatewayUpdate,
} from '@packages/domain'
import type { EntityPaymentGatewaysRepository } from '@database/repositories'
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

const PaymentGatewayIdParamSchema = z.object({
  paymentGatewayId: z.string().uuid('Invalid payment gateway ID format'),
})

type TPaymentGatewayIdParam = z.infer<typeof PaymentGatewayIdParamSchema>

/**
 * Controller for managing entity payment gateway resources.
 *
 * Endpoints:
 * - GET    /                                    List all entity payment gateways
 * - GET    /condominium/:condominiumId          Get by condominium
 * - GET    /building/:buildingId                Get by building
 * - GET    /gateway/:paymentGatewayId           Get by payment gateway
 * - GET    /:id                                 Get by ID
 * - POST   /                                    Create entity payment gateway
 * - PATCH  /:id                                 Update entity payment gateway
 * - DELETE /:id                                 Delete entity payment gateway
 */
export class EntityPaymentGatewaysController extends BaseController<
  TEntityPaymentGateway,
  TEntityPaymentGatewayCreate,
  TEntityPaymentGatewayUpdate
> {
  constructor(repository: EntityPaymentGatewaysRepository) {
    super(repository)
    this.getByCondominiumId = this.getByCondominiumId.bind(this)
    this.getByBuildingId = this.getByBuildingId.bind(this)
    this.getByPaymentGatewayId = this.getByPaymentGatewayId.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list },
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
        path: '/gateway/:paymentGatewayId',
        handler: this.getByPaymentGatewayId,
        middlewares: [paramsValidator(PaymentGatewayIdParamSchema)],
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
        middlewares: [bodyValidator(entityPaymentGatewayCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          paramsValidator(IdParamSchema),
          bodyValidator(entityPaymentGatewayUpdateSchema),
        ],
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
    const repo = this.repository as EntityPaymentGatewaysRepository

    try {
      const gateways = await repo.getByCondominiumId(ctx.params.condominiumId)
      return ctx.ok({ data: gateways })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByBuildingId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TBuildingIdParam>(c)
    const repo = this.repository as EntityPaymentGatewaysRepository

    try {
      const gateways = await repo.getByBuildingId(ctx.params.buildingId)
      return ctx.ok({ data: gateways })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByPaymentGatewayId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TPaymentGatewayIdParam>(c)
    const repo = this.repository as EntityPaymentGatewaysRepository

    try {
      const gateways = await repo.getByPaymentGatewayId(ctx.params.paymentGatewayId)
      return ctx.ok({ data: gateways })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
