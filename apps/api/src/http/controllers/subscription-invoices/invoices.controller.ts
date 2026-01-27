import type { Context } from 'hono'
import {
  subscriptionInvoiceCreateSchema,
  subscriptionInvoiceUpdateSchema,
  type TSubscriptionInvoice,
  type TSubscriptionInvoiceCreate,
  type TSubscriptionInvoiceUpdate,
} from '@packages/domain'
import type { SubscriptionInvoicesRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import {
  GenerateInvoiceService,
  MarkInvoicePaidService,
} from '../../../services/subscription-invoices'

const CompanyIdParamSchema = z.object({
  companyId: z.string().uuid('Invalid company ID format'),
})

type TCompanyIdParam = z.infer<typeof CompanyIdParamSchema>

const InvoicesQuerySchema = z.object({
  status: z.enum(['draft', 'sent', 'pending', 'paid', 'overdue', 'cancelled', 'refunded']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

type TInvoicesQuery = z.infer<typeof InvoicesQuerySchema>

const MarkPaidBodySchema = z.object({
  paymentId: z.string().uuid().optional(),
  paymentMethod: z.string().max(50).optional(),
})

type TMarkPaidBody = z.infer<typeof MarkPaidBodySchema>

/**
 * Controller for managing subscription invoices.
 *
 * Endpoints:
 * - GET    /management-companies/:companyId/invoices          Get all invoices by company
 * - GET    /subscription-invoices/:id                         Get invoice by ID
 * - PATCH  /subscription-invoices/:id/mark-paid              Mark invoice as paid
 */
export class SubscriptionInvoicesController extends BaseController<
  TSubscriptionInvoice,
  TSubscriptionInvoiceCreate,
  TSubscriptionInvoiceUpdate
> {
  private readonly markPaidService: MarkInvoicePaidService

  constructor(repository: SubscriptionInvoicesRepository) {
    super(repository)
    this.markPaidService = new MarkInvoicePaidService(repository)

    this.getInvoicesByCompany = this.getInvoicesByCompany.bind(this)
    this.markInvoicePaid = this.markInvoicePaid.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/management-companies/:companyId/invoices',
        handler: this.getInvoicesByCompany,
        middlewares: [paramsValidator(CompanyIdParamSchema), queryValidator(InvoicesQuerySchema)],
      },
      {
        method: 'get',
        path: '/subscription-invoices/:id',
        handler: this.getById,
        middlewares: [paramsValidator(IdParamSchema)],
      },
      {
        method: 'patch',
        path: '/subscription-invoices/:id/mark-paid',
        handler: this.markInvoicePaid,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(MarkPaidBodySchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private async getInvoicesByCompany(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TInvoicesQuery, TCompanyIdParam>(c)
    const repo = this.repository as SubscriptionInvoicesRepository

    try {
      const invoices = await repo.listByCompanyId(ctx.params.companyId, {
        status: ctx.query.status,
        dateFrom: ctx.query.dateFrom,
        dateTo: ctx.query.dateTo,
      })

      return ctx.ok({ data: invoices })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async markInvoicePaid(c: Context): Promise<Response> {
    const ctx = this.ctx<TMarkPaidBody, unknown, { id: string }>(c)

    try {
      const result = await this.markPaidService.execute({
        invoiceId: ctx.params.id,
        paymentId: ctx.body.paymentId,
        paymentMethod: ctx.body.paymentMethod,
      })

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
