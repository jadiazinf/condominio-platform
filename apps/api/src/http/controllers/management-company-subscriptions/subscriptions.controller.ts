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
  ManagementCompaniesRepository,
  UsersRepository,
} from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import type { ISubscriptionHistoryQuery } from '@database/repositories/management-company-subscriptions.repository'
import {
  CreateSubscriptionService,
  UpdateSubscriptionService,
  CancelSubscriptionService,
  RenewSubscriptionService,
  CalculatePricingService,
} from '../../../services/subscriptions'
import { SendSubscriptionCancellationEmailService } from '../../../services/email'
import { DatabaseService } from '@database/service'
import { isUserAuthenticated } from '../../middlewares/utils/auth/is-user-authenticated'
import { isSuperadmin } from '../../middlewares/utils/auth/is-superadmin'
import { requireSuperadminPermission } from '../../middlewares/utils/auth/has-superadmin-permission'

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

const SubscriptionHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  startDateFrom: z.string().optional(),
  startDateTo: z.string().optional(),
})

type TSubscriptionHistoryQuery = z.infer<typeof SubscriptionHistoryQuerySchema>

const CalculatePricingQuerySchema = z.object({
  condominiumRate: z.coerce.number().positive().optional(),
  unitRate: z.coerce.number().positive().optional(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.coerce.number().nonnegative().optional(),
})

type TCalculatePricingQuery = z.infer<typeof CalculatePricingQuerySchema>

/**
 * Controller for managing management company subscriptions.
 *
 * Endpoints:
 * - GET    /management-companies/:companyId/subscription             Get active subscription
 * - GET    /management-companies/:companyId/subscriptions            Get all subscriptions (history)
 * - GET    /management-companies/:companyId/subscription/pricing     Calculate subscription pricing
 * - POST   /management-companies/:companyId/subscription             Create new subscription
 * - PATCH  /management-companies/:companyId/subscription             Update active subscription
 * - DELETE /management-companies/:companyId/subscription             Cancel active subscription
 * - POST   /management-companies/:companyId/subscription/renew       Renew subscription
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
  private readonly pricingService: CalculatePricingService

  constructor(
    repository: ManagementCompanySubscriptionsRepository,
    membersRepository: ManagementCompanyMembersRepository,
    companiesRepository: ManagementCompaniesRepository,
    usersRepository: UsersRepository
  ) {
    super(repository)
    const db = DatabaseService.getInstance().getDb()
    this.createService = new CreateSubscriptionService(repository)
    this.updateService = new UpdateSubscriptionService(repository)
    this.cancelService = new CancelSubscriptionService(repository, {
      membersRepository,
      companiesRepository,
      usersRepository,
      emailService: new SendSubscriptionCancellationEmailService(),
      db,
    })
    this.renewService = new RenewSubscriptionService(repository)
    this.pricingService = new CalculatePricingService(db)

    this.getActiveSubscription = this.getActiveSubscription.bind(this)
    this.getAllSubscriptions = this.getAllSubscriptions.bind(this)
    this.calculatePricing = this.calculatePricing.bind(this)
    this.createSubscription = this.createSubscription.bind(this)
    this.updateActiveSubscription = this.updateActiveSubscription.bind(this)
    this.cancelSubscription = this.cancelSubscription.bind(this)
    this.renewSubscription = this.renewSubscription.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      // Superadmin only: Get active subscription
      {
        method: 'get',
        path: '/management-companies/:companyId/subscription',
        handler: this.getActiveSubscription,
        middlewares: [
          isUserAuthenticated,
          isSuperadmin,
          paramsValidator(CompanyIdParamSchema),
        ],
      },
      // Superadmin only: Get subscription history
      {
        method: 'get',
        path: '/management-companies/:companyId/subscriptions',
        handler: this.getAllSubscriptions,
        middlewares: [
          isUserAuthenticated,
          isSuperadmin,
          paramsValidator(CompanyIdParamSchema),
          queryValidator(SubscriptionHistoryQuerySchema),
        ],
      },
      // Superadmin only: Calculate subscription pricing
      {
        method: 'get',
        path: '/management-companies/:companyId/subscription/pricing',
        handler: this.calculatePricing,
        middlewares: [
          isUserAuthenticated,
          isSuperadmin,
          paramsValidator(CompanyIdParamSchema),
          queryValidator(CalculatePricingQuerySchema),
        ],
      },
      // Superadmin with manage permission: Create subscription
      {
        method: 'post',
        path: '/management-companies/:companyId/subscription',
        handler: this.createSubscription,
        middlewares: [
          isUserAuthenticated,
          isSuperadmin,
          requireSuperadminPermission('platform_management_companies', 'manage'),
          paramsValidator(CompanyIdParamSchema),
          bodyValidator(managementCompanySubscriptionCreateSchema),
        ],
      },
      // Superadmin with manage permission: Update subscription
      {
        method: 'patch',
        path: '/management-companies/:companyId/subscription',
        handler: this.updateActiveSubscription,
        middlewares: [
          isUserAuthenticated,
          isSuperadmin,
          requireSuperadminPermission('platform_management_companies', 'manage'),
          paramsValidator(CompanyIdParamSchema),
          bodyValidator(managementCompanySubscriptionUpdateSchema),
        ],
      },
      // Superadmin with manage permission: Cancel subscription
      {
        method: 'delete',
        path: '/management-companies/:companyId/subscription',
        handler: this.cancelSubscription,
        middlewares: [
          isUserAuthenticated,
          isSuperadmin,
          requireSuperadminPermission('platform_management_companies', 'manage'),
          paramsValidator(CompanyIdParamSchema),
          bodyValidator(CancelSubscriptionBodySchema),
        ],
      },
      // Superadmin with manage permission: Renew subscription
      {
        method: 'post',
        path: '/management-companies/:companyId/subscription/renew',
        handler: this.renewSubscription,
        middlewares: [
          isUserAuthenticated,
          isSuperadmin,
          requireSuperadminPermission('platform_management_companies', 'manage'),
          paramsValidator(CompanyIdParamSchema),
          bodyValidator(RenewSubscriptionBodySchema),
        ],
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
    const ctx = this.ctx<unknown, TSubscriptionHistoryQuery, TCompanyIdParam>(c)
    const repo = this.repository as ManagementCompanySubscriptionsRepository

    try {
      const query: ISubscriptionHistoryQuery = {
        page: ctx.query.page,
        limit: ctx.query.limit,
        search: ctx.query.search,
        startDateFrom: ctx.query.startDateFrom ? new Date(ctx.query.startDateFrom) : undefined,
        startDateTo: ctx.query.startDateTo ? new Date(ctx.query.startDateTo) : undefined,
      }

      const result = await repo.getByCompanyIdPaginated(ctx.params.companyId, query)

      return ctx.ok(result)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async calculatePricing(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TCalculatePricingQuery, TCompanyIdParam>(c)

    try {
      const result = await this.pricingService.execute({
        managementCompanyId: ctx.params.companyId,
        condominiumRate: ctx.query.condominiumRate,
        unitRate: ctx.query.unitRate,
        discountType: ctx.query.discountType,
        discountValue: ctx.query.discountValue,
      })

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
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
