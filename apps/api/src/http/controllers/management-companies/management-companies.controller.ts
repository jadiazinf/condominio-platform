import type { Context } from 'hono'
import { useTranslation } from '@intlify/hono'
import { LocaleDictionary } from '@locales/dictionary'
import {
  managementCompanyCreateSchema,
  managementCompanyUpdateSchema,
  managementCompaniesQuerySchema,
  managementCompanyMembersQuerySchema,
  paymentConceptsQuerySchema,
  type TManagementCompany,
  type TManagementCompanyCreate,
  type TManagementCompanyUpdate,
  type TManagementCompaniesQuerySchema,
  type TManagementCompanyMembersQuerySchema,
  type TPaymentConceptsQuerySchema,
  ESystemRole,
} from '@packages/domain'
import type {
  ManagementCompaniesRepository,
  ManagementCompanySubscriptionsRepository,
  LocationsRepository,
  UsersRepository,
} from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { IdParamSchema, ManagementCompanyIdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import type { ISubscriptionHistoryQuery } from '@database/repositories/management-company-subscriptions.repository'
import { ValidateSubscriptionLimitsService, CancelSubscriptionService, type TResourceType } from '@src/services/subscriptions'
import { SendSubscriptionCancellationEmailService } from '@src/services/email'
import { DatabaseService } from '@database/service'
import { AppError } from '@errors/index'
import type { ManagementCompanyMembersRepository, PaymentConceptsRepository } from '@database/repositories'

const TaxIdNumberParamSchema = z.object({
  taxIdNumber: z.string().min(1),
})

type TTaxIdNumberParam = z.infer<typeof TaxIdNumberParamSchema>

const LocationIdParamSchema = z.object({
  locationId: z.string().uuid('Invalid location ID format'),
})

type TLocationIdParam = z.infer<typeof LocationIdParamSchema>

const ToggleActiveBodySchema = z.object({
  isActive: z.boolean(),
})

type TToggleActiveBody = z.infer<typeof ToggleActiveBodySchema>

const CheckLimitParamSchema = z.object({
  id: z.string().uuid('Invalid management company ID format'),
  resourceType: z.enum(['condominium', 'unit', 'user']),
})

type TCheckLimitParam = z.infer<typeof CheckLimitParamSchema>

const MemberSubscriptionHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  startDateFrom: z.string().optional(),
  startDateTo: z.string().optional(),
})

type TMemberSubscriptionHistoryQuery = z.infer<typeof MemberSubscriptionHistoryQuerySchema>

const MemberCancelSubscriptionBodySchema = z.object({
  cancellationReason: z
    .string()
    .optional()
    .transform(val => (val === '' ? undefined : val)),
})

type TMemberCancelSubscriptionBody = z.infer<typeof MemberCancelSubscriptionBodySchema>

/**
 * Controller for managing management company resources.
 *
 * Endpoints:
 * - GET    /                                  List all management companies
 * - GET    /tax-id-number/:taxIdNumber        Get by tax ID number
 * - GET    /location/:locationId              Get by location
 * - GET    /:id                               Get by ID
 * - POST   /                                  Create management company
 * - PATCH  /:id                               Update management company
 * - DELETE /:id                               Delete management company
 */
export class ManagementCompaniesController extends BaseController<
  TManagementCompany,
  TManagementCompanyCreate,
  TManagementCompanyUpdate
> {
  private readonly managementCompaniesRepository: ManagementCompaniesRepository
  private readonly validateLimitsService: ValidateSubscriptionLimitsService
  private readonly cancelService: CancelSubscriptionService
  private readonly subscriptionsRepository: ManagementCompanySubscriptionsRepository
  private readonly locationsRepository: LocationsRepository
  private readonly usersRepository: UsersRepository
  private readonly membersRepository?: ManagementCompanyMembersRepository
  private readonly paymentConceptsRepository?: PaymentConceptsRepository

  constructor(
    repository: ManagementCompaniesRepository,
    subscriptionsRepository: ManagementCompanySubscriptionsRepository,
    locationsRepository: LocationsRepository,
    usersRepository: UsersRepository,
    membersRepository?: ManagementCompanyMembersRepository,
    paymentConceptsRepository?: PaymentConceptsRepository
  ) {
    super(repository)
    this.managementCompaniesRepository = repository
    this.subscriptionsRepository = subscriptionsRepository
    this.locationsRepository = locationsRepository
    this.usersRepository = usersRepository
    this.membersRepository = membersRepository
    this.paymentConceptsRepository = paymentConceptsRepository
    this.validateLimitsService = new ValidateSubscriptionLimitsService(
      subscriptionsRepository,
      repository
    )
    const db = DatabaseService.getInstance().getDb()
    this.cancelService = new CancelSubscriptionService(subscriptionsRepository, {
      membersRepository,
      companiesRepository: repository,
      usersRepository,
      emailService: new SendSubscriptionCancellationEmailService(),
      db,
    })
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.listPaginated,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), queryValidator(managementCompaniesQuerySchema)],
      },
      {
        method: 'get',
        path: '/tax-id-number/:taxIdNumber',
        handler: this.getByTaxIdNumber,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), paramsValidator(TaxIdNumberParamSchema)],
      },
      {
        method: 'get',
        path: '/location/:locationId',
        handler: this.getByLocationId,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), paramsValidator(LocationIdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), paramsValidator(IdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id/usage-stats',
        handler: this.getUsageStats,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), paramsValidator(IdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id/subscription/can-create/:resourceType',
        handler: this.checkCanCreateResource,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), paramsValidator(CheckLimitParamSchema)],
      },
      // ── Member routes (for management company members via unified role system) ──
      {
        method: 'get',
        path: '/:managementCompanyId/me',
        handler: this.getMyCompany,
        middlewares: [authMiddleware, paramsValidator(ManagementCompanyIdParamSchema), requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.SUPPORT, ESystemRole.VIEWER)],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/subscription',
        handler: this.getMyCompanySubscription,
        middlewares: [authMiddleware, paramsValidator(ManagementCompanyIdParamSchema), requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.SUPPORT, ESystemRole.VIEWER)],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/usage-stats',
        handler: this.getMyCompanyUsageStats,
        middlewares: [authMiddleware, paramsValidator(ManagementCompanyIdParamSchema), requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.SUPPORT, ESystemRole.VIEWER)],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/subscriptions',
        handler: this.getMyCompanySubscriptions,
        middlewares: [authMiddleware, paramsValidator(ManagementCompanyIdParamSchema), requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.SUPPORT, ESystemRole.VIEWER), queryValidator(MemberSubscriptionHistoryQuerySchema)],
      },
      {
        method: 'post',
        path: '/:managementCompanyId/me/subscription/cancel',
        handler: this.cancelMyCompanySubscription,
        middlewares: [authMiddleware, paramsValidator(ManagementCompanyIdParamSchema), requireRole(ESystemRole.ADMIN), bodyValidator(MemberCancelSubscriptionBodySchema)],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/members',
        handler: this.getMyCompanyMembers,
        middlewares: [authMiddleware, paramsValidator(ManagementCompanyIdParamSchema), requireRole(ESystemRole.ADMIN), queryValidator(managementCompanyMembersQuerySchema)],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/payment-concepts',
        handler: this.getMyCompanyPaymentConcepts,
        middlewares: [authMiddleware, paramsValidator(ManagementCompanyIdParamSchema), requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.SUPPORT, ESystemRole.VIEWER), queryValidator(paymentConceptsQuerySchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), bodyValidator(managementCompanyCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), paramsValidator(IdParamSchema), bodyValidator(managementCompanyUpdateSchema)],
      },
      {
        method: 'patch',
        path: '/:id/toggle-active',
        handler: this.toggleActive,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), paramsValidator(IdParamSchema), bodyValidator(ToggleActiveBodySchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Override getById to populate relations
  // ─────────────────────────────────────────────────────────────────────────────

  protected override getById = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)

    try {
      // Include inactive companies for viewing purposes
      const company = await this.repository.getById(ctx.params.id, true)

      if (!company) {
        return ctx.notFound({ error: 'Management company not found' })
      }

      // Populate relations
      const [location, createdByUser] = await Promise.all([
        // Get location with full hierarchy (country -> province -> city)
        company.locationId ? this.locationsRepository.getByIdWithHierarchy(company.locationId) : Promise.resolve(null),
        // Get created by user (include inactive users to show who created it)
        company.createdBy ? this.usersRepository.getById(company.createdBy, true) : Promise.resolve(null),
      ])

      // Check if created by user is superadmin
      let enrichedCreatedByUser = createdByUser
      if (createdByUser) {
        const isSuperadmin = await this.usersRepository.checkIsSuperadmin(createdByUser.id)
        enrichedCreatedByUser = {
          ...createdByUser,
          isSuperadmin,
        }
      }

      const populated: TManagementCompany = {
        ...company,
        location: location ?? undefined,
        createdByUser: enrichedCreatedByUser ?? undefined,
      }

      return ctx.ok({ data: populated })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Override create to inject createdBy from authenticated user
  // ─────────────────────────────────────────────────────────────────────────────

  protected override create = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TManagementCompanyCreate>(c)
    const user = ctx.getAuthenticatedUser()

    if (ctx.body.email) {
      const existingByEmail = await this.managementCompaniesRepository.getByEmail(ctx.body.email)
      if (existingByEmail) {
        throw AppError.alreadyExists('ManagementCompany', 'email')
      }
    }

    const entity = await this.repository.create({
      ...ctx.body,
      createdBy: user.id,
    })

    return ctx.created({ data: entity })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Override update to check email uniqueness
  // ─────────────────────────────────────────────────────────────────────────────

  protected override update = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TManagementCompanyUpdate, unknown, { id: string }>(c)

    if (ctx.body.email) {
      const existingByEmail = await this.managementCompaniesRepository.getByEmail(ctx.body.email)
      if (existingByEmail && existingByEmail.id !== ctx.params.id) {
        throw AppError.alreadyExists('ManagementCompany', 'email')
      }
    }

    const entity = await this.repository.update(ctx.params.id, ctx.body)
    if (!entity) {
      throw AppError.notFound('ManagementCompany', ctx.params.id)
    }

    return ctx.ok({ data: entity })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private listPaginated = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TManagementCompaniesQuerySchema>(c)
    const repo = this.repository as ManagementCompaniesRepository
    const result = await repo.listPaginated(ctx.query)
    return ctx.ok(result)
  }

  private toggleActive = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TToggleActiveBody, unknown, { id: string }>(c)
    const repo = this.repository as ManagementCompaniesRepository
    const company = await repo.toggleActive(ctx.params.id, ctx.body.isActive)

    if (!company) {
      return ctx.notFound({ error: 'Management company not found' })
    }

    return ctx.ok({ data: company })
  }

  private getByTaxIdNumber = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TTaxIdNumberParam>(c)
    const repo = this.repository as ManagementCompaniesRepository

    try {
      const company = await repo.getByTaxIdNumber(ctx.params.taxIdNumber)

      if (!company) {
        return ctx.notFound({ error: 'Management company not found' })
      }

      return ctx.ok({ data: company })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByLocationId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TLocationIdParam>(c)
    const repo = this.repository as ManagementCompaniesRepository

    try {
      const companies = await repo.getByLocationId(ctx.params.locationId)
      return ctx.ok({ data: companies })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getUsageStats = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const repo = this.repository as ManagementCompaniesRepository

    try {
      const stats = await repo.getUsageStats(ctx.params.id)
      return ctx.ok({ data: stats })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Member Handlers (read-only, for management_company role)
  // ─────────────────────────────────────────────────────────────────────────────

  private getMyCompany = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { managementCompanyId: string }>(c)

    try {
      const company = await this.repository.getById(ctx.params.managementCompanyId, true)

      if (!company) {
        return ctx.notFound({ error: 'Management company not found' })
      }

      const location = company.locationId
        ? await this.locationsRepository.getByIdWithHierarchy(company.locationId)
        : null

      const populated: TManagementCompany = {
        ...company,
        location: location ?? undefined,
      }

      return ctx.ok({ data: populated })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getMyCompanySubscription = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { managementCompanyId: string }>(c)

    try {
      const subscription = await this.subscriptionsRepository.getActiveByCompanyId(ctx.params.managementCompanyId)

      if (!subscription) {
        const t = useTranslation(c)
        return ctx.notFound({ error: t(LocaleDictionary.http.services.subscriptions.noActiveSubscription) })
      }

      return ctx.ok({ data: subscription })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getMyCompanySubscriptions = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TMemberSubscriptionHistoryQuery, { managementCompanyId: string }>(c)

    try {
      const query: ISubscriptionHistoryQuery = {
        page: ctx.query.page,
        limit: ctx.query.limit,
        search: ctx.query.search,
        startDateFrom: ctx.query.startDateFrom ? new Date(ctx.query.startDateFrom) : undefined,
        startDateTo: ctx.query.startDateTo ? new Date(ctx.query.startDateTo) : undefined,
      }

      const result = await this.subscriptionsRepository.getByCompanyIdPaginated(
        ctx.params.managementCompanyId,
        query
      )

      return ctx.ok(result)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private cancelMyCompanySubscription = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TMemberCancelSubscriptionBody, unknown, { managementCompanyId: string }>(c)
    const user = ctx.getAuthenticatedUser()

    try {
      const subscription = await this.subscriptionsRepository.getActiveByCompanyId(
        ctx.params.managementCompanyId
      )

      if (!subscription) {
        const t = useTranslation(c)
        return ctx.notFound({ error: t(LocaleDictionary.http.services.subscriptions.noActiveSubscription) })
      }

      const result = await this.cancelService.execute({
        subscriptionId: subscription.id,
        cancelledBy: user.id,
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

  private getMyCompanyUsageStats = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { managementCompanyId: string }>(c)
    const repo = this.repository as ManagementCompaniesRepository

    try {
      const stats = await repo.getUsageStats(ctx.params.managementCompanyId)
      return ctx.ok({ data: stats })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private checkCanCreateResource = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TCheckLimitParam>(c)

    try {
      const result = await this.validateLimitsService.execute({
        managementCompanyId: ctx.params.id,
        resourceType: ctx.params.resourceType as TResourceType,
      })

      if (!result.success) {
        return ctx.notFound({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getMyCompanyMembers = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TManagementCompanyMembersQuerySchema, { managementCompanyId: string }>(c)

    try {
      if (!this.membersRepository) {
        return ctx.badRequest({ error: 'Members repository not configured' })
      }

      // requireRole(ESystemRole.ADMIN) middleware already ensures only admins reach this handler
      const result = await this.membersRepository.listByCompanyIdPaginated(
        ctx.params.managementCompanyId,
        ctx.query
      )

      return ctx.ok(result)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getMyCompanyPaymentConcepts = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TPaymentConceptsQuerySchema, { managementCompanyId: string }>(c)

    try {
      if (!this.paymentConceptsRepository) {
        return ctx.badRequest({ error: 'Payment concepts repository not configured' })
      }

      const result = await this.paymentConceptsRepository.listByManagementCompanyPaginated(
        ctx.params.managementCompanyId,
        ctx.query
      )

      return ctx.ok(result)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
