import type { Context } from 'hono'
import { z } from 'zod'
import type { PaymentAllocationsV2Repository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'

const PaymentIdParamSchema = z.object({ paymentId: z.string().uuid() })
const ChargeIdParamSchema = z.object({ chargeId: z.string().uuid() })

export class BillingAllocationsController extends BaseController<any, any, any> {
  constructor(private allocationsRepo: PaymentAllocationsV2Repository) {
    super(allocationsRepo)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/payment/:paymentId',
        handler: this.getByPayment,
        middlewares: [authMiddleware, paramsValidator(PaymentIdParamSchema)],
      },
      {
        method: 'get',
        path: '/charge/:chargeId',
        handler: this.getByCharge,
        middlewares: [authMiddleware, paramsValidator(ChargeIdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
    ]
  }

  private getByPayment = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { paymentId: string }>(c)
    const allocations = await this.allocationsRepo.findByPayment(ctx.params.paymentId)
    return ctx.ok({ data: allocations })
  }

  private getByCharge = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { chargeId: string }>(c)
    const allocations = await this.allocationsRepo.findByCharge(ctx.params.chargeId)
    return ctx.ok({ data: allocations })
  }
}
