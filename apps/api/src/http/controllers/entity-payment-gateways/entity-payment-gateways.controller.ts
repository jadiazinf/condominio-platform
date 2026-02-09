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
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'

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
 * List is scoped by condominiumId from the requireRole middleware context.
 *
 * Endpoints:
 * - GET    /                                    List entity payment gateways (scoped by condominium)
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
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole('ADMIN')] },
      {
        method: 'get',
        path: '/building/:buildingId',
        handler: this.getByBuildingId,
        middlewares: [authMiddleware, requireRole('ADMIN'), paramsValidator(BuildingIdParamSchema)],
      },
      {
        method: 'get',
        path: '/gateway/:paymentGatewayId',
        handler: this.getByPaymentGatewayId,
        middlewares: [authMiddleware, requireRole('ADMIN'), paramsValidator(PaymentGatewayIdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole('ADMIN'), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole('ADMIN'), bodyValidator(entityPaymentGatewayCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          requireRole('ADMIN'),
          paramsValidator(IdParamSchema),
          bodyValidator(entityPaymentGatewayUpdateSchema),
        ],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, requireRole('ADMIN'), paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  protected override list = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const repo = this.repository as EntityPaymentGatewaysRepository

    const gateways = await repo.getByCondominiumId(condominiumId)
    return ctx.ok({ data: gateways })
  }

  private getByBuildingId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TBuildingIdParam>(c)
    const repo = this.repository as EntityPaymentGatewaysRepository

    try {
      const gateways = await repo.getByBuildingId(ctx.params.buildingId)
      return ctx.ok({ data: gateways })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByPaymentGatewayId = async (c: Context): Promise<Response> => {
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
