import type { Context } from 'hono'
import {
  managementCompanySubscriptionCreateSchema,
  managementCompanySubscriptionUpdateSchema,
  type TManagementCompanySubscription,
  type TManagementCompanySubscriptionCreate,
  type TManagementCompanySubscriptionUpdate,
} from '@packages/domain'
import type {
  ManagementCompanySubscriptionsRepository,
  ManagementCompanyMembersRepository,
} from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import {
  CreateSubscriptionService,
  UpdateSubscriptionService,
  CancelSubscriptionService,
  RenewSubscriptionService,
} from '../../../services/subscriptions'

const CompanyIdParamSchema = z.object({
  companyId: z.string().uuid('Invalid company ID format'),
})

type TCompanyIdParam = z.infer<typeof CompanyIdParamSchema>

const CancelSubscriptionBodySchema = z.object({
  cancelledBy: z.string().uuid(),
  cancellationReason: z.string().optional(),
})

type TCancelSubscriptionBody = z.infer<typeof CancelSubscriptionBodySchema>

const RenewSubscriptionBodySchema = z.object({
  billingCycle: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual', 'custom']).optional(),
  basePrice: z.number().positive().optional(),
})

type TRenewSubscriptionBody = z.infer<typeof RenewSubscriptionBodySchema>

/**
 * Controller for managing management company subscriptions.
 *
 * Endpoints:
 * - GET    /management-companies/:companyId/subscription        Get active subscription
 * - GET    /management-companies/:companyId/subscriptions       Get all subscriptions (history)
 * - POST   /management-companies/:companyId/subscription        Create new subscription
 * - PATCH  /management-companies/:companyId/subscription        Update active subscription
 * - DELETE /management-companies/:companyId/subscription        Cancel active subscription
 * - POST   /management-companies/:companyId/subscription/renew  Renew subscription
 */
export class ManagementCompanySubscriptionsController extends BaseController<
  TManagementCompanySubscription,
  TManagementCompanySubscriptionCreate,
  TManagementCompanySubscriptionUpdate
> {
  private readonly createService: CreateSubscriptionService
  private readonly updateService: UpdateSubscriptionService
  private readonly cancelService: CancelSubscriptionService
  private readonly renewService: RenewSubscriptionService

  constructor(
    repository: ManagementCompanySubscriptionsRepository,
    membersRepository: ManagementCompanyMembersRepository
  ) {
    super(repository)
    this.createService = new CreateSubscriptionService(repository)
    this.updateService = new UpdateSubscriptionService(repository)
    this.cancelService = new CancelSubscriptionService(repository)
    this.renewService = new RenewSubscriptionService(repository)

    this.getActiveSubscription = this.getActiveSubscription.bind(this)
    this.getAllSubscriptions = this.getAllSubscriptions.bind(this)
    this.createSubscription = this.createSubscription.bind(this)
    this.updateActiveSubscription = this.updateActiveSubscription.bind(this)
    this.cancelSubscription = this.cancelSubscription.bind(this)
    this.renewSubscription = this.renewSubscription.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/management-companies/:companyId/subscription',
        handler: this.getActiveSubscription,
        middlewares: [paramsValidator(CompanyIdParamSchema)],
      },
      {
        method: 'get',
        path: '/management-companies/:companyId/subscriptions',
        handler: this.getAllSubscriptions,
        middlewares: [paramsValidator(CompanyIdParamSchema)],
      },
      {
        method: 'post',
        path: '/management-companies/:companyId/subscription',
        handler: this.createSubscription,
        middlewares: [
          paramsValidator(CompanyIdParamSchema),
          bodyValidator(managementCompanySubscriptionCreateSchema),
        ],
      },
      {
        method: 'patch',
        path: '/management-companies/:companyId/subscription',
        handler: this.updateActiveSubscription,
        middlewares: [
          paramsValidator(CompanyIdParamSchema),
          bodyValidator(managementCompanySubscriptionUpdateSchema),
        ],
      },
      {
        method: 'delete',
        path: '/management-companies/:companyId/subscription',
        handler: this.cancelSubscription,
        middlewares: [paramsValidator(CompanyIdParamSchema), bodyValidator(CancelSubscriptionBodySchema)],
      },
      {
        method: 'post',
        path: '/management-companies/:companyId/subscription/renew',
        handler: this.renewSubscription,
        middlewares: [paramsValidator(CompanyIdParamSchema), bodyValidator(RenewSubscriptionBodySchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private async getActiveSubscription(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TCompanyIdParam>(c)
    const repo = this.repository as ManagementCompanySubscriptionsRepository

    try {
      const subscription = await repo.getActiveByCompanyId(ctx.params.companyId)

      if (!subscription) {
        return ctx.notFound({ error: 'No active subscription found' })
      }

      return ctx.ok({ data: subscription })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getAllSubscriptions(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TCompanyIdParam>(c)
    const repo = this.repository as ManagementCompanySubscriptionsRepository

    try {
      const subscriptions = await repo.getByCompanyId(ctx.params.companyId)

      return ctx.ok({ data: subscriptions })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async createSubscription(c: Context): Promise<Response> {
    const ctx = this.ctx<TManagementCompanySubscriptionCreate, unknown, TCompanyIdParam>(c)

    try {
      const result = await this.createService.execute({
        ...ctx.body,
        managementCompanyId: ctx.params.companyId,
      })

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      return ctx.created({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async updateActiveSubscription(c: Context): Promise<Response> {
    const ctx = this.ctx<TManagementCompanySubscriptionUpdate, unknown, TCompanyIdParam>(c)
    const repo = this.repository as ManagementCompanySubscriptionsRepository

    try {
      // Get active subscription
      const subscription = await repo.getActiveByCompanyId(ctx.params.companyId)

      if (!subscription) {
        return ctx.notFound({ error: 'No active subscription found' })
      }

      const result = await this.updateService.execute({
        subscriptionId: subscription.id,
        data: ctx.body,
      })

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async cancelSubscription(c: Context): Promise<Response> {
    const ctx = this.ctx<TCancelSubscriptionBody, unknown, TCompanyIdParam>(c)
    const repo = this.repository as ManagementCompanySubscriptionsRepository

    try {
      // Get active subscription
      const subscription = await repo.getActiveByCompanyId(ctx.params.companyId)

      if (!subscription) {
        return ctx.notFound({ error: 'No active subscription found' })
      }

      const result = await this.cancelService.execute({
        subscriptionId: subscription.id,
        cancelledBy: ctx.body.cancelledBy,
        cancellationReason: ctx.body.cancellationReason,
      })

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async renewSubscription(c: Context): Promise<Response> {
    const ctx = this.ctx<TRenewSubscriptionBody, unknown, TCompanyIdParam>(c)
    const repo = this.repository as ManagementCompanySubscriptionsRepository

    try {
      // Get active subscription
      const subscription = await repo.getActiveByCompanyId(ctx.params.companyId)

      if (!subscription) {
        return ctx.notFound({ error: 'No active subscription found' })
      }

      const result = await this.renewService.execute({
        subscriptionId: subscription.id,
        billingCycle: ctx.body.billingCycle,
        basePrice: ctx.body.basePrice,
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
