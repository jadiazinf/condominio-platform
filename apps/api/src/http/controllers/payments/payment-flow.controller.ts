import type { Context } from 'hono'
import { ESystemRole } from '@packages/domain'
import type { QuotasRepository, PaymentConceptsRepository, PaymentConceptBankAccountsRepository, BankAccountsRepository, PaymentsRepository, GatewayTransactionsRepository } from '@database/repositories'
import type { PaymentGatewayManager } from '@src/services/payment-gateways/gateway-manager'
import type { ApplyPaymentToQuotaService } from '@src/services/payment-applications/apply-payment-to-quota.service'
import { HttpContext } from '../../context'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { AUTHENTICATED_USER_PROP } from '../../middlewares/utils/auth/is-user-authenticated'
import { createRouter } from '../create-router'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import { GetPayableQuotasService } from '@src/services/quotas/get-payable-quotas.service'
import { ValidateQuotaSelectionService } from '@src/services/payments/validate-quota-selection.service'
import { InitiatePaymentFlowService } from '@src/services/payments/initiate-payment-flow.service'
import type { BncPaymentAdapter } from '@src/services/payment-gateways/adapters/bnc.adapter'

// ─────────────────────────────────────────────────────────────────────────────
// Validation Schemas
// ─────────────────────────────────────────────────────────────────────────────

const PayableQuotasParamSchema = z.object({
  unitId: z.string().uuid(),
})

const ValidateSelectionBodySchema = z.object({
  unitId: z.string().uuid(),
  quotaIds: z.array(z.string().uuid()).min(1),
  amounts: z.record(z.string().uuid(), z.string()),
})

const InitiatePaymentBodySchema = z.object({
  unitId: z.string().uuid(),
  quotaIds: z.array(z.string().uuid()).min(1),
  amounts: z.record(z.string().uuid(), z.string()),
  method: z.enum(['c2p', 'vpos', 'manual']),
  paymentMethod: z.string(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bankAccountId: z.string().uuid(),
  receiptNumber: z.string().optional(),
  receiptUrl: z.string().url().optional(),
  notes: z.string().optional(),
  c2pData: z.object({
    debtorBankCode: z.string(),
    debtorCellPhone: z.string(),
    debtorID: z.string(),
    token: z.string(),
  }).optional(),
  vposData: z.object({
    cardType: z.number(),
    cardNumber: z.string(),
    expiration: z.number(),
    cvv: z.number(),
    cardHolderName: z.string(),
    cardHolderID: z.number(),
    accountType: z.number(),
  }).optional(),
})

const GatewayTypeParamSchema = z.object({
  gatewayType: z.string(),
})

const ConceptIdsQuerySchema = z.object({
  conceptIds: z.string().transform(s => s.split(',')),
})

/**
 * Controller for the multi-step payment flow.
 *
 * Endpoints:
 * - GET  /payable-quotas/:unitId  Get payable quotas grouped by concept
 * - POST /validate-selection      Validate quota selection before payment
 * - POST /initiate                Initiate payment (BNC C2P/VPOS or manual)
 * - GET  /gateway-health/:gatewayType  Check gateway availability
 */
export class PaymentFlowController {
  private readonly getPayableQuotasService: GetPayableQuotasService
  private readonly validateSelectionService: ValidateQuotaSelectionService
  private readonly initiatePaymentService: InitiatePaymentFlowService

  constructor(
    private readonly deps: {
      quotasRepo: QuotasRepository
      conceptsRepo: PaymentConceptsRepository
      conceptBankAccountsRepo: PaymentConceptBankAccountsRepository
      bankAccountsRepo: BankAccountsRepository
      paymentsRepo: PaymentsRepository
      gatewayTransactionsRepo: GatewayTransactionsRepository
      gatewayManager: PaymentGatewayManager
      applyPaymentService: ApplyPaymentToQuotaService
    },
  ) {
    this.getPayableQuotasService = new GetPayableQuotasService(
      deps.quotasRepo,
      deps.conceptBankAccountsRepo,
      deps.bankAccountsRepo,
      deps.conceptsRepo,
    )

    this.validateSelectionService = new ValidateQuotaSelectionService(
      deps.quotasRepo,
      deps.conceptsRepo,
      deps.conceptBankAccountsRepo,
      deps.bankAccountsRepo,
    )

    this.initiatePaymentService = new InitiatePaymentFlowService(
      this.validateSelectionService,
      deps.paymentsRepo,
      deps.applyPaymentService,
      deps.gatewayManager,
      deps.gatewayTransactionsRepo,
    )
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/payable-quotas/:unitId',
        handler: this.getPayableQuotas,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.USER, ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(PayableQuotasParamSchema),
        ],
      },
      {
        method: 'post',
        path: '/validate-selection',
        handler: this.validateSelection,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.USER, ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          bodyValidator(ValidateSelectionBodySchema),
        ],
      },
      {
        method: 'post',
        path: '/initiate',
        handler: this.initiatePayment,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.USER, ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          bodyValidator(InitiatePaymentBodySchema),
        ],
      },
      {
        method: 'get',
        path: '/gateway-health/:gatewayType',
        handler: this.gatewayHealth,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.USER, ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(GatewayTypeParamSchema),
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

  private getPayableQuotas = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<unknown, { conceptIds?: string }, { unitId: string }>(c)

    // Get concept IDs from query params (comma-separated) or fetch all for the unit
    const rawConceptIds = c.req.query('conceptIds')
    let conceptIds = rawConceptIds ? rawConceptIds.split(',').filter(Boolean) : []

    // If no concept IDs provided, fetch all distinct concepts for this unit
    if (conceptIds.length === 0) {
      const distinctConcepts = await this.deps.quotasRepo.getDistinctConceptsByUnit(ctx.params.unitId)
      conceptIds = distinctConcepts.map(c => c.id)
    }

    if (conceptIds.length === 0) {
      return ctx.ok({ data: { groups: [] } })
    }

    const result = await this.getPayableQuotasService.execute({
      unitId: ctx.params.unitId,
      conceptIds,
    })

    if (!result.success) {
      return ctx.internalError({ error: result.error })
    }

    return ctx.ok({ data: result.data })
  }

  private validateSelection = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<z.infer<typeof ValidateSelectionBodySchema>>(c)

    const result = await this.validateSelectionService.execute({
      unitId: ctx.body.unitId,
      quotaIds: ctx.body.quotaIds,
      amounts: ctx.body.amounts,
    })

    if (!result.success) {
      return this.handleServiceError(ctx, result)
    }

    return ctx.ok({ data: result.data })
  }

  private initiatePayment = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<z.infer<typeof InitiatePaymentBodySchema>>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    const result = await this.initiatePaymentService.execute({
      ...ctx.body,
      userId: user.id,
    })

    if (!result.success) {
      return this.handleServiceError(ctx, result)
    }

    return ctx.created({ data: result.data })
  }

  private gatewayHealth = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<unknown, unknown, { gatewayType: string }>(c)
    const { gatewayType } = ctx.params

    if (!this.deps.gatewayManager.hasAdapter(gatewayType as any)) {
      return ctx.ok({ data: { available: false, message: 'Gateway no configurado' } })
    }

    const adapter = this.deps.gatewayManager.getAdapter(gatewayType as any)

    // BNC adapter has a healthCheck method
    if ('healthCheck' in adapter && typeof adapter.healthCheck === 'function') {
      const available = await (adapter as BncPaymentAdapter).healthCheck()
      return ctx.ok({
        data: {
          available,
          message: available ? 'Gateway disponible' : 'Gateway no disponible',
        },
      })
    }

    // For non-BNC gateways, check configuration
    const configResult = adapter.validateConfiguration({})
    return ctx.ok({
      data: {
        available: configResult.valid,
        message: configResult.valid ? 'Gateway configurado' : 'Gateway no configurado',
      },
    })
  }

  private handleServiceError(
    ctx: HttpContext,
    result: { success: false; error: string; code: string },
  ): Response | Promise<Response> {
    switch (result.code) {
      case 'NOT_FOUND':
        return ctx.notFound({ error: result.error })
      case 'BAD_REQUEST':
        return ctx.badRequest({ error: result.error })
      case 'CONFLICT':
        return ctx.conflict({ error: result.error })
      default:
        return ctx.internalError({ error: result.error })
    }
  }
}
