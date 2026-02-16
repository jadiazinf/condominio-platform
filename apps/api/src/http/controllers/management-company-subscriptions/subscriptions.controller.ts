import type { Context } from 'hono'
import { useTranslation } from '@intlify/hono'
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
  SubscriptionAcceptancesRepository,
  SubscriptionTermsConditionsRepository,
  SubscriptionAuditHistoryRepository,
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
  SubscriptionAuditService,
} from '../../../services/subscriptions'
import { SendSubscriptionCancellationEmailService, SendSubscriptionAcceptanceEmailService } from '../../../services/email'
import { DatabaseService } from '@database/service'
import { isUserAuthenticated } from '../../middlewares/utils/auth/is-user-authenticated'
import { requireRole } from '../../middlewares/auth'
import { LocaleDictionary } from '../../../locales/dictionary'

const CompanyIdParamSchema = z.object({
  companyId: z.string().uuid('Invalid company ID format'),
})

type TCompanyIdParam = z.infer<typeof CompanyIdParamSchema>

const CancelSubscriptionBodySchema = z.object({
  cancelledBy: z.string().uuid(),
  cancellationReason: z
    .string()
    .optional()
    .transform(val => (val === '' ? undefined : val)),
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
  rateId: z.string().uuid().optional(),
  condominiumRate: z.coerce.number().positive().optional(),
  unitRate: z.coerce.number().positive().optional(),
  userRate: z.coerce.number().positive().optional(),
  billingCycle: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual', 'custom']).optional(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.coerce.number().nonnegative().optional(),
  // Subscription limits (for calculating based on max allowed, not current usage)
  condominiumCount: z.coerce.number().int().nonnegative().optional(),
  unitCount: z.coerce.number().int().nonnegative().optional(),
  userCount: z.coerce.number().int().nonnegative().optional(),
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
    usersRepository: UsersRepository,
    acceptancesRepository?: SubscriptionAcceptancesRepository,
    termsRepository?: SubscriptionTermsConditionsRepository,
    auditRepository?: SubscriptionAuditHistoryRepository
  ) {
    super(repository)
    const db = DatabaseService.getInstance().getDb()
    const auditService = auditRepository ? new SubscriptionAuditService(auditRepository) : undefined
    this.createService = new CreateSubscriptionService(repository, {
      membersRepository,
      companiesRepository,
      acceptancesRepository,
      termsRepository,
      usersRepository,
      auditService,
      emailService: new SendSubscriptionAcceptanceEmailService(),
    })
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

  }

  get routes(): TRouteDefinition[] {
    return [
      // Superadmin only: Get active subscription
      {
        method: 'get',
        path: '/platform/management-companies/:companyId/subscription',
        handler: this.getActiveSubscription,
        middlewares: [
          isUserAuthenticated,
          requireRole('SUPERADMIN'),
          paramsValidator(CompanyIdParamSchema),
        ],
      },
      // Superadmin only: Get subscription history
      {
        method: 'get',
        path: '/platform/management-companies/:companyId/subscriptions',
        handler: this.getAllSubscriptions,
        middlewares: [
          isUserAuthenticated,
          requireRole('SUPERADMIN'),
          paramsValidator(CompanyIdParamSchema),
          queryValidator(SubscriptionHistoryQuerySchema),
        ],
      },
      // Superadmin only: Calculate subscription pricing
      {
        method: 'get',
        path: '/platform/management-companies/:companyId/subscription/pricing',
        handler: this.calculatePricing,
        middlewares: [
          isUserAuthenticated,
          requireRole('SUPERADMIN'),
          paramsValidator(CompanyIdParamSchema),
          queryValidator(CalculatePricingQuerySchema),
        ],
      },
      // Superadmin with manage permission: Create subscription
      {
        method: 'post',
        path: '/platform/management-companies/:companyId/subscription',
        handler: this.createSubscription,
        middlewares: [
          isUserAuthenticated,
          requireRole('SUPERADMIN'),

          paramsValidator(CompanyIdParamSchema),
          bodyValidator(managementCompanySubscriptionCreateSchema),
        ],
      },
      // Superadmin with manage permission: Update subscription
      {
        method: 'patch',
        path: '/platform/management-companies/:companyId/subscription',
        handler: this.updateActiveSubscription,
        middlewares: [
          isUserAuthenticated,
          requireRole('SUPERADMIN'),

          paramsValidator(CompanyIdParamSchema),
          bodyValidator(managementCompanySubscriptionUpdateSchema),
        ],
      },
      // Superadmin with manage permission: Cancel subscription
      {
        method: 'delete',
        path: '/platform/management-companies/:companyId/subscription',
        handler: this.cancelSubscription,
        middlewares: [
          isUserAuthenticated,
          requireRole('SUPERADMIN'),

          paramsValidator(CompanyIdParamSchema),
          bodyValidator(CancelSubscriptionBodySchema),
        ],
      },
      // Superadmin with manage permission: Renew subscription
      {
        method: 'post',
        path: '/platform/management-companies/:companyId/subscription/renew',
        handler: this.renewSubscription,
        middlewares: [
          isUserAuthenticated,
          requireRole('SUPERADMIN'),

          paramsValidator(CompanyIdParamSchema),
          bodyValidator(RenewSubscriptionBodySchema),
        ],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private getActiveSubscription = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TCompanyIdParam>(c)
    const t = useTranslation(c)
    const repo = this.repository as ManagementCompanySubscriptionsRepository

    try {
      const subscription = await repo.getActiveByCompanyId(ctx.params.companyId)

      if (!subscription) {
        return ctx.notFound({ error: t(LocaleDictionary.http.services.subscriptions.noActiveSubscription) })
      }

      return ctx.ok({ data: subscription })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getAllSubscriptions = async (c: Context): Promise<Response> => {
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

  private calculatePricing = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TCalculatePricingQuery, TCompanyIdParam>(c)

    try {
      const result = await this.pricingService.execute({
        managementCompanyId: ctx.params.companyId,
        rateId: ctx.query.rateId,
        condominiumRate: ctx.query.condominiumRate,
        unitRate: ctx.query.unitRate,
        userRate: ctx.query.userRate,
        billingCycle: ctx.query.billingCycle,
        discountType: ctx.query.discountType,
        discountValue: ctx.query.discountValue,
        condominiumCount: ctx.query.condominiumCount,
        unitCount: ctx.query.unitCount,
        userCount: ctx.query.userCount,
      })

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private createSubscription = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TManagementCompanySubscriptionCreate, unknown, TCompanyIdParam>(c)
    const t = useTranslation(c)

    try {
      const result = await this.createService.execute({
        ...ctx.body,
        managementCompanyId: ctx.params.companyId,
      })

      if (!result.success) {
        return ctx.badRequest({ error: t(result.error) })
      }

      return ctx.created({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private updateActiveSubscription = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TManagementCompanySubscriptionUpdate, unknown, TCompanyIdParam>(c)
    const t = useTranslation(c)
    const repo = this.repository as ManagementCompanySubscriptionsRepository

    try {
      // Get active subscription
      const subscription = await repo.getActiveByCompanyId(ctx.params.companyId)

      if (!subscription) {
        return ctx.notFound({ error: t(LocaleDictionary.http.services.subscriptions.noActiveSubscription) })
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

  private cancelSubscription = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TCancelSubscriptionBody, unknown, TCompanyIdParam>(c)
    const t = useTranslation(c)
    const repo = this.repository as ManagementCompanySubscriptionsRepository

    try {
      // Get active subscription
      const subscription = await repo.getActiveByCompanyId(ctx.params.companyId)

      if (!subscription) {
        return ctx.notFound({ error: t(LocaleDictionary.http.services.subscriptions.noActiveSubscription) })
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

  private renewSubscription = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TRenewSubscriptionBody, unknown, TCompanyIdParam>(c)
    const t = useTranslation(c)
    const repo = this.repository as ManagementCompanySubscriptionsRepository

    try {
      // Get active subscription
      const subscription = await repo.getActiveByCompanyId(ctx.params.companyId)

      if (!subscription) {
        return ctx.notFound({ error: t(LocaleDictionary.http.services.subscriptions.noActiveSubscription) })
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
