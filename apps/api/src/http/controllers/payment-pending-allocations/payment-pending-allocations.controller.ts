import type { Context } from 'hono'
import { z } from 'zod'
import { EAllocationStatuses, type TPaymentPendingAllocation } from '@packages/domain'
import type { PaymentPendingAllocationsRepository, QuotasRepository } from '@database/repositories'
import { HttpContext } from '../../context'
import {
  bodyValidator,
  paramsValidator,
  queryValidator,
} from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { createRouter } from '../create-router'
import { AUTHENTICATED_USER_PROP } from '../../middlewares/utils/auth/is-user-authenticated'
import {
  AllocatePendingToQuotaService,
  RefundPendingAllocationService,
  GetPendingAllocationsService,
  GetAllocationsByPaymentService,
} from '@src/services/payment-pending-allocations'

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const PaymentIdParamSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID format'),
})

type TPaymentIdParam = z.infer<typeof PaymentIdParamSchema>

const StatusQuerySchema = z.object({
  status: z.enum(EAllocationStatuses).optional(),
})

type TStatusQuery = z.infer<typeof StatusQuerySchema>

const AllocateToQuotaBodySchema = z.object({
  quotaId: z.string().uuid(),
  resolutionNotes: z.string().max(1000).optional().nullable(),
})

type TAllocateToQuotaBody = z.infer<typeof AllocateToQuotaBodySchema>

const RefundBodySchema = z.object({
  resolutionNotes: z.string().min(1).max(1000),
})

type TRefundBody = z.infer<typeof RefundBodySchema>

type TIdParam = z.infer<typeof IdParamSchema>

/**
 * Controller for managing payment pending allocations.
 * Handles excess payment amounts that need administrative resolution.
 *
 * Endpoints:
 * - GET    /                           List all pending allocations
 * - GET    /payment/:paymentId         Get allocations for a payment
 * - GET    /:id                        Get allocation by ID
 * - POST   /:id/allocate               Allocate to a quota
 * - POST   /:id/refund                 Mark as refunded
 */
export class PaymentPendingAllocationsController {
  private readonly allocatePendingToQuotaService: AllocatePendingToQuotaService
  private readonly refundPendingAllocationService: RefundPendingAllocationService
  private readonly getPendingAllocationsService: GetPendingAllocationsService
  private readonly getAllocationsByPaymentService: GetAllocationsByPaymentService

  constructor(
    private readonly paymentPendingAllocationsRepository: PaymentPendingAllocationsRepository,
    private readonly quotasRepository: QuotasRepository
  ) {
    // Initialize services
    this.allocatePendingToQuotaService = new AllocatePendingToQuotaService(
      paymentPendingAllocationsRepository,
      quotasRepository
    )
    this.refundPendingAllocationService = new RefundPendingAllocationService(
      paymentPendingAllocationsRepository
    )
    this.getPendingAllocationsService = new GetPendingAllocationsService(
      paymentPendingAllocationsRepository
    )
    this.getAllocationsByPaymentService = new GetAllocationsByPaymentService(
      paymentPendingAllocationsRepository
    )

  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.listPending,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), queryValidator(StatusQuerySchema)],
      },
      {
        method: 'get',
        path: '/payment/:paymentId',
        handler: this.getByPaymentId,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), paramsValidator(PaymentIdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT'), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/:id/allocate',
        handler: this.allocateToQuota,
        middlewares: [
          authMiddleware,
          requireRole('ADMIN', 'ACCOUNTANT'),
          paramsValidator(IdParamSchema),
          bodyValidator(AllocateToQuotaBodySchema),
        ],
      },
      {
        method: 'post',
        path: '/:id/refund',
        handler: this.refund,
        middlewares: [
          authMiddleware,
          requireRole('ADMIN', 'ACCOUNTANT'),
          paramsValidator(IdParamSchema),
          bodyValidator(RefundBodySchema),
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

  private listPending = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TStatusQuery>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    // TODO: Filter by condominiumId via JOIN through payment → unit → building.condominiumId

    try {
      if (ctx.query.status) {
        const allocations = await this.paymentPendingAllocationsRepository.getByStatus(
          ctx.query.status
        )
        return ctx.ok({ data: allocations })
      }

      const result = await this.getPendingAllocationsService.execute({})

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getById = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TIdParam>(c)

    try {
      const allocation = await this.paymentPendingAllocationsRepository.getById(ctx.params.id)

      if (!allocation) {
        return ctx.notFound({ error: 'Allocation not found' })
      }

      return ctx.ok({ data: allocation })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByPaymentId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TPaymentIdParam>(c)

    try {
      const result = await this.getAllocationsByPaymentService.execute({
        paymentId: ctx.params.paymentId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private allocateToQuota = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TAllocateToQuotaBody, unknown, TIdParam>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    try {
      const result = await this.allocatePendingToQuotaService.execute({
        allocationId: ctx.params.id,
        quotaId: ctx.body.quotaId,
        resolutionNotes: ctx.body.resolutionNotes,
        allocatedByUserId: user.id,
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

      return ctx.ok({ data: result.data, message: 'Allocation completed successfully' })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private refund = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TRefundBody, unknown, TIdParam>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    try {
      const result = await this.refundPendingAllocationService.execute({
        allocationId: ctx.params.id,
        resolutionNotes: ctx.body.resolutionNotes,
        allocatedByUserId: user.id,
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

      return ctx.ok({ data: result.data, message: 'Refund processed successfully' })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ─────────────────────────────────────────────────────────────────────────────

  private handleError(ctx: HttpContext, error: unknown): Response | Promise<Response> {
    console.error('PaymentPendingAllocationsController error:', error)
    return ctx.internalError({ error: 'An unexpected error occurred' })
  }
}
