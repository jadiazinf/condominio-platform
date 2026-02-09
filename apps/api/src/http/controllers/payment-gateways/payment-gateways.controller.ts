import type { Context } from 'hono'
import {
  paymentGatewayCreateSchema,
  paymentGatewayUpdateSchema,
  type TPaymentGateway,
  type TPaymentGatewayCreate,
  type TPaymentGatewayUpdate,
} from '@packages/domain'
import type { PaymentGatewaysRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'

const NameParamSchema = z.object({
  name: z.string().min(1),
})

type TNameParam = z.infer<typeof NameParamSchema>

const GatewayTypeParamSchema = z.object({
  gatewayType: z.string().min(1),
})

type TGatewayTypeParam = z.infer<typeof GatewayTypeParamSchema>

/**
 * Controller for managing payment gateway resources.
 *
 * Endpoints:
 * - GET    /                    List all payment gateways
 * - GET    /production          Get production (non-sandbox) gateways
 * - GET    /name/:name          Get by name
 * - GET    /type/:gatewayType   Get by gateway type
 * - GET    /:id                 Get by ID
 * - POST   /                    Create payment gateway
 * - PATCH  /:id                 Update payment gateway
 * - DELETE /:id                 Delete payment gateway
 */
export class PaymentGatewaysController extends BaseController<
  TPaymentGateway,
  TPaymentGatewayCreate,
  TPaymentGatewayUpdate
> {
  constructor(repository: PaymentGatewaysRepository) {
    super(repository)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole('SUPERADMIN')] },
      { method: 'get', path: '/production', handler: this.getProductionGateways, middlewares: [authMiddleware, requireRole('SUPERADMIN')] },
      {
        method: 'get',
        path: '/name/:name',
        handler: this.getByName,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(NameParamSchema)],
      },
      {
        method: 'get',
        path: '/type/:gatewayType',
        handler: this.getByType,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(GatewayTypeParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), bodyValidator(paymentGatewayCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(IdParamSchema), bodyValidator(paymentGatewayUpdateSchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private getByName = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TNameParam>(c)
    const repo = this.repository as PaymentGatewaysRepository

    try {
      const gateway = await repo.getByName(ctx.params.name)

      if (!gateway) {
        return ctx.notFound({ error: 'Payment gateway not found' })
      }

      return ctx.ok({ data: gateway })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByType = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TGatewayTypeParam>(c)
    const repo = this.repository as PaymentGatewaysRepository

    try {
      const gateways = await repo.getByType(
        ctx.params.gatewayType as TPaymentGateway['gatewayType']
      )
      return ctx.ok({ data: gateways })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getProductionGateways = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const repo = this.repository as PaymentGatewaysRepository

    try {
      const gateways = await repo.getProductionGateways()
      return ctx.ok({ data: gateways })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
