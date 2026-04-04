import type { Context } from 'hono'
import { useTranslation } from '@intlify/hono'
import { LocaleDictionary } from '@locales/dictionary'
import {
  managementCompanyCreateSchema,
  managementCompanyUpdateSchema,
  managementCompaniesQuerySchema,
  managementCompanyMembersQuerySchema,
  type TManagementCompany,
  type TManagementCompanyCreate,
  type TManagementCompanyUpdate,
  type TManagementCompaniesQuerySchema,
  type TManagementCompanyMembersQuerySchema,
  ESystemRole,
} from '@packages/domain'
import type {
  ManagementCompaniesRepository,
  ManagementCompanySubscriptionsRepository,
  LocationsRepository,
  UsersRepository,
  UserInvitationsRepository,
  UserRolesRepository,
  RolesRepository,
} from '@database/repositories'
import { BaseController } from '../base.controller'
import {
  bodyValidator,
  paramsValidator,
  queryValidator,
} from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { AUTHENTICATED_USER_PROP } from '../../middlewares/utils/auth/is-user-authenticated'
import { IdParamSchema, ManagementCompanyIdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import type { ISubscriptionHistoryQuery } from '@database/repositories/management-company-subscriptions.repository'
import {
  ValidateSubscriptionLimitsService,
  CancelSubscriptionService,
  type TResourceType,
} from '@src/services/subscriptions'
import { CreateMemberWithInvitationService } from '@src/services/management-company-members/create-member-with-invitation.service'
import { SendSubscriptionCancellationEmailService } from '@src/services/email'
import { DatabaseService } from '@database/service'
import { AppError } from '@errors/index'
import type {
  ManagementCompanyMembersRepository,
  AuditLogsRepository,
  CurrenciesRepository,
} from '@database/repositories'
import { UpdatePreferredCurrencyService } from '@src/services/management-companies/update-preferred-currency.service'

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

const PreferredCurrencyBodySchema = z.object({
  currencyId: z.string().uuid().nullable(),
})

type TPreferredCurrencyBody = z.infer<typeof PreferredCurrencyBodySchema>

type TToggleActiveBody = z.infer<typeof ToggleActiveBodySchema>

const CheckLimitParamSchema = z.object({
  id: z.string().uuid('Invalid management company ID format'),
  resourceType: z.enum(['condominium', 'unit', 'user']),
})

type TCheckLimitParam = z.infer<typeof CheckLimitParamSchema>

const MyCompanyCheckLimitParamSchema = z.object({
  managementCompanyId: z.string().uuid('Invalid management company ID format'),
  resourceType: z.enum(['condominium', 'unit', 'user']),
})

type TMyCompanyCheckLimitParam = z.infer<typeof MyCompanyCheckLimitParamSchema>

const InviteMemberBodySchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phoneCountryCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  idDocumentType: z.enum(['J', 'G', 'V', 'E', 'P']).optional(),
  idDocumentNumber: z.string().optional(),
  memberRole: z.enum(['admin', 'accountant', 'support', 'viewer']),
})

type TInviteMemberBody = z.infer<typeof InviteMemberBodySchema>

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

const MemberIdParamSchema = z.object({
  managementCompanyId: z.string().uuid(),
  memberId: z.string().uuid(),
})

type TMemberIdParam = z.infer<typeof MemberIdParamSchema>

const MemberAuditLogIdParamSchema = z.object({
  managementCompanyId: z.string().uuid(),
  memberId: z.string().uuid(),
  logId: z.string().uuid(),
})

type TMemberAuditLogIdParam = z.infer<typeof MemberAuditLogIdParamSchema>

const UpdateMemberRoleBodySchema = z.object({
  role: z.enum(['admin', 'accountant', 'support', 'viewer']),
})

type TUpdateMemberRoleBody = z.infer<typeof UpdateMemberRoleBodySchema>

const MemberAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  action: z.enum(['INSERT', 'UPDATE', 'DELETE']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

type TMemberAuditLogsQuery = z.infer<typeof MemberAuditLogsQuerySchema>

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
  private readonly createMemberWithInvitationService: CreateMemberWithInvitationService | null
  private readonly subscriptionsRepository: ManagementCompanySubscriptionsRepository
  private readonly locationsRepository: LocationsRepository
  private readonly usersRepository: UsersRepository
  private readonly membersRepository?: ManagementCompanyMembersRepository
  private readonly auditLogsRepository?: AuditLogsRepository
  private readonly currenciesRepository?: CurrenciesRepository

  constructor(
    repository: ManagementCompaniesRepository,
    subscriptionsRepository: ManagementCompanySubscriptionsRepository,
    locationsRepository: LocationsRepository,
    usersRepository: UsersRepository,
    membersRepository?: ManagementCompanyMembersRepository,
    invitationsRepository?: UserInvitationsRepository,
    userRolesRepository?: UserRolesRepository,
    rolesRepository?: RolesRepository,
    auditLogsRepository?: AuditLogsRepository,
    currenciesRepository?: CurrenciesRepository
  ) {
    super(repository)
    this.managementCompaniesRepository = repository
    this.subscriptionsRepository = subscriptionsRepository
    this.locationsRepository = locationsRepository
    this.usersRepository = usersRepository
    this.membersRepository = membersRepository
    this.auditLogsRepository = auditLogsRepository
    this.currenciesRepository = currenciesRepository
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
    this.createMemberWithInvitationService =
      membersRepository && invitationsRepository && userRolesRepository && rolesRepository
        ? new CreateMemberWithInvitationService(
            membersRepository,
            repository,
            invitationsRepository,
            usersRepository,
            userRolesRepository,
            rolesRepository
          )
        : null
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.listPaginated,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.SUPERADMIN),
          queryValidator(managementCompaniesQuerySchema),
        ],
      },
      {
        method: 'get',
        path: '/tax-id-number/:taxIdNumber',
        handler: this.getByTaxIdNumber,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(TaxIdNumberParamSchema),
        ],
      },
      {
        method: 'get',
        path: '/location/:locationId',
        handler: this.getByLocationId,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(LocationIdParamSchema),
        ],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(IdParamSchema),
        ],
      },
      {
        method: 'get',
        path: '/:id/usage-stats',
        handler: this.getUsageStats,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(IdParamSchema),
        ],
      },
      {
        method: 'get',
        path: '/:id/subscription/can-create/:resourceType',
        handler: this.checkCanCreateResource,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(CheckLimitParamSchema),
        ],
      },
      // ── Member routes (for management company members via unified role system) ──
      {
        method: 'get',
        path: '/:managementCompanyId/me',
        handler: this.getMyCompany,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          requireRole(
            ESystemRole.ADMIN,
            ESystemRole.ACCOUNTANT,
            ESystemRole.SUPPORT,
            ESystemRole.VIEWER
          ),
        ],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/subscription',
        handler: this.getMyCompanySubscription,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          requireRole(
            ESystemRole.ADMIN,
            ESystemRole.ACCOUNTANT,
            ESystemRole.SUPPORT,
            ESystemRole.VIEWER
          ),
        ],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/usage-stats',
        handler: this.getMyCompanyUsageStats,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          requireRole(
            ESystemRole.ADMIN,
            ESystemRole.ACCOUNTANT,
            ESystemRole.SUPPORT,
            ESystemRole.VIEWER
          ),
        ],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/subscriptions',
        handler: this.getMyCompanySubscriptions,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          requireRole(
            ESystemRole.ADMIN,
            ESystemRole.ACCOUNTANT,
            ESystemRole.SUPPORT,
            ESystemRole.VIEWER
          ),
          queryValidator(MemberSubscriptionHistoryQuerySchema),
        ],
      },
      {
        method: 'post',
        path: '/:managementCompanyId/me/subscription/cancel',
        handler: this.cancelMyCompanySubscription,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          requireRole(ESystemRole.ADMIN),
          bodyValidator(MemberCancelSubscriptionBodySchema),
        ],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/subscription/can-create/:resourceType',
        handler: this.checkMyCompanyCanCreateResource,
        middlewares: [
          authMiddleware,
          paramsValidator(MyCompanyCheckLimitParamSchema),
          requireRole(ESystemRole.ADMIN),
        ],
      },
      {
        method: 'post',
        path: '/:managementCompanyId/me/members/invite',
        handler: this.inviteMyCompanyMember,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          requireRole(ESystemRole.ADMIN),
          bodyValidator(InviteMemberBodySchema),
        ],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/members',
        handler: this.getMyCompanyMembers,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          requireRole(ESystemRole.ADMIN),
          queryValidator(managementCompanyMembersQuerySchema),
        ],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/members/:memberId',
        handler: this.getMyCompanyMemberDetail,
        middlewares: [
          authMiddleware,
          paramsValidator(MemberIdParamSchema),
          requireRole(ESystemRole.ADMIN),
        ],
      },
      {
        method: 'patch',
        path: '/:managementCompanyId/me/members/:memberId/role',
        handler: this.updateMyCompanyMemberRole,
        middlewares: [
          authMiddleware,
          paramsValidator(MemberIdParamSchema),
          requireRole(ESystemRole.ADMIN),
          bodyValidator(UpdateMemberRoleBodySchema),
        ],
      },
      {
        method: 'post',
        path: '/:managementCompanyId/me/members/:memberId/deactivate',
        handler: this.deactivateMyCompanyMember,
        middlewares: [
          authMiddleware,
          paramsValidator(MemberIdParamSchema),
          requireRole(ESystemRole.ADMIN),
        ],
      },
      {
        method: 'post',
        path: '/:managementCompanyId/me/members/:memberId/reactivate',
        handler: this.reactivateMyCompanyMember,
        middlewares: [
          authMiddleware,
          paramsValidator(MemberIdParamSchema),
          requireRole(ESystemRole.ADMIN),
        ],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/members/:memberId/audit-logs',
        handler: this.getMyCompanyMemberAuditLogs,
        middlewares: [
          authMiddleware,
          paramsValidator(MemberIdParamSchema),
          requireRole(ESystemRole.ADMIN),
        ],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/members/:memberId/audit-logs/paginated',
        handler: this.getMyCompanyMemberAuditLogsPaginated,
        middlewares: [
          authMiddleware,
          paramsValidator(MemberIdParamSchema),
          requireRole(ESystemRole.ADMIN),
          queryValidator(MemberAuditLogsQuerySchema),
        ],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/members/:memberId/audit-logs/:logId',
        handler: this.getMyCompanyMemberAuditLogDetail,
        middlewares: [
          authMiddleware,
          paramsValidator(MemberAuditLogIdParamSchema),
          requireRole(ESystemRole.ADMIN),
        ],
      },
      {
        method: 'get',
        path: '/:managementCompanyId/me/preferred-currency',
        handler: this.getMyCompanyPreferredCurrency,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          requireRole(
            ESystemRole.ADMIN,
            ESystemRole.ACCOUNTANT,
            ESystemRole.SUPPORT,
            ESystemRole.VIEWER
          ),
        ],
      },
      {
        method: 'patch',
        path: '/:managementCompanyId/me/preferred-currency',
        handler: this.updateMyCompanyPreferredCurrency,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          requireRole(ESystemRole.ADMIN),
          bodyValidator(PreferredCurrencyBodySchema),
        ],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.SUPERADMIN),
          bodyValidator(managementCompanyCreateSchema),
        ],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(IdParamSchema),
          bodyValidator(managementCompanyUpdateSchema),
        ],
      },
      {
        method: 'patch',
        path: '/:id/toggle-active',
        handler: this.toggleActive,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(IdParamSchema),
          bodyValidator(ToggleActiveBodySchema),
        ],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(IdParamSchema),
        ],
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
        company.locationId
          ? this.locationsRepository.getByIdWithHierarchy(company.locationId)
          : Promise.resolve(null),
        // Get created by user (include inactive users to show who created it)
        company.createdBy
          ? this.usersRepository.getById(company.createdBy, true)
          : Promise.resolve(null),
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
      const subscription = await this.subscriptionsRepository.getActiveByCompanyId(
        ctx.params.managementCompanyId
      )

      if (!subscription) {
        const t = useTranslation(c)
        return ctx.notFound({
          error: t(LocaleDictionary.http.services.subscriptions.noActiveSubscription),
        })
      }

      return ctx.ok({ data: subscription })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getMyCompanySubscriptions = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TMemberSubscriptionHistoryQuery, { managementCompanyId: string }>(
      c
    )

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
        return ctx.notFound({
          error: t(LocaleDictionary.http.services.subscriptions.noActiveSubscription),
        })
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

  private checkMyCompanyCanCreateResource = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TMyCompanyCheckLimitParam>(c)

    try {
      const result = await this.validateLimitsService.execute({
        managementCompanyId: ctx.params.managementCompanyId,
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

  private inviteMyCompanyMember = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TInviteMemberBody, unknown, { managementCompanyId: string }>(c)

    if (!this.createMemberWithInvitationService) {
      return ctx.badRequest({ error: 'Member invitation service not configured' })
    }

    const authenticatedUser = c.get(AUTHENTICATED_USER_PROP)

    try {
      const result = await this.createMemberWithInvitationService.execute({
        managementCompanyId: ctx.params.managementCompanyId,
        email: ctx.body.email,
        firstName: ctx.body.firstName ?? null,
        lastName: ctx.body.lastName ?? null,
        displayName:
          ctx.body.firstName && ctx.body.lastName
            ? `${ctx.body.firstName} ${ctx.body.lastName}`
            : null,
        phoneCountryCode: ctx.body.phoneCountryCode ?? null,
        phoneNumber: ctx.body.phoneNumber ?? null,
        idDocumentType: ctx.body.idDocumentType ?? null,
        idDocumentNumber: ctx.body.idDocumentNumber ?? null,
        memberRole: ctx.body.memberRole,
        isPrimaryAdmin: false,
        createdBy: authenticatedUser?.id,
      })

      if (!result.success) {
        if (result.code === 'CONFLICT') {
          return ctx.conflict({ error: result.error })
        }
        return ctx.badRequest({ error: result.error })
      }

      return ctx.created({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getMyCompanyMembers = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<
      unknown,
      TManagementCompanyMembersQuerySchema,
      { managementCompanyId: string }
    >(c)

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

  private getMyCompanyMemberDetail = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TMemberIdParam>(c)

    try {
      if (!this.membersRepository) {
        return ctx.badRequest({ error: 'Members repository not configured' })
      }

      const member = await this.membersRepository.getByIdWithUser(ctx.params.memberId)

      if (!member || member.managementCompanyId !== ctx.params.managementCompanyId) {
        return ctx.notFound({ error: 'Member not found' })
      }

      return ctx.ok({ data: member })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private updateMyCompanyMemberRole = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TUpdateMemberRoleBody, unknown, TMemberIdParam>(c)

    try {
      if (!this.membersRepository) {
        return ctx.badRequest({ error: 'Members repository not configured' })
      }

      const member = await this.membersRepository.getById(ctx.params.memberId)
      if (!member || member.managementCompanyId !== ctx.params.managementCompanyId) {
        return ctx.notFound({ error: 'Member not found' })
      }

      if (!member.isActive) {
        return ctx.badRequest({ error: 'Cannot change role of an inactive member' })
      }

      if (member.isPrimaryAdmin) {
        return ctx.badRequest({ error: 'Cannot change role of the primary admin' })
      }

      const updated = await this.membersRepository.updateRole(ctx.params.memberId, ctx.body.role)
      if (!updated) {
        return ctx.notFound({ error: 'Member not found' })
      }

      return ctx.ok({ data: updated })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private deactivateMyCompanyMember = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TMemberIdParam>(c)
    const authenticatedUser = c.get(AUTHENTICATED_USER_PROP)

    try {
      if (!this.membersRepository) {
        return ctx.badRequest({ error: 'Members repository not configured' })
      }

      const member = await this.membersRepository.getById(ctx.params.memberId)
      if (!member || member.managementCompanyId !== ctx.params.managementCompanyId) {
        return ctx.notFound({ error: 'Member not found' })
      }

      if (!member.isActive) {
        return ctx.badRequest({ error: 'Member is already inactive' })
      }

      // Cannot deactivate yourself
      if (member.userId === authenticatedUser?.id) {
        return ctx.badRequest({ error: 'Cannot deactivate yourself' })
      }

      const deactivated = await this.membersRepository.removeMember(
        ctx.params.memberId,
        authenticatedUser?.id
      )
      if (!deactivated) {
        return ctx.notFound({ error: 'Member not found' })
      }

      return ctx.ok({ data: deactivated })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private reactivateMyCompanyMember = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TMemberIdParam>(c)

    try {
      if (!this.membersRepository) {
        return ctx.badRequest({ error: 'Members repository not configured' })
      }

      const member = await this.membersRepository.getByIdWithUser(ctx.params.memberId)
      if (!member || member.managementCompanyId !== ctx.params.managementCompanyId) {
        return ctx.notFound({ error: 'Member not found' })
      }

      if (member.isActive) {
        return ctx.badRequest({ error: 'Member is already active' })
      }

      // Cannot reactivate if user hasn't verified email (hasn't accepted invitation)
      if (member.user && !member.user.isEmailVerified) {
        return ctx.badRequest({
          error: 'Cannot reactivate a user who has not accepted their invitation',
        })
      }

      const reactivated = await this.membersRepository.reactivateMember(ctx.params.memberId)
      if (!reactivated) {
        return ctx.notFound({ error: 'Member not found' })
      }

      return ctx.ok({ data: reactivated })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getMyCompanyMemberAuditLogs = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TMemberIdParam>(c)

    try {
      if (!this.membersRepository || !this.auditLogsRepository) {
        return ctx.badRequest({ error: 'Required repositories not configured' })
      }

      // Verify member belongs to the company
      const member = await this.membersRepository.getById(ctx.params.memberId)
      if (!member || member.managementCompanyId !== ctx.params.managementCompanyId) {
        return ctx.notFound({ error: 'Member not found' })
      }

      const logs = await this.auditLogsRepository.getByTableAndRecord(
        'management_company_members',
        ctx.params.memberId
      )

      return ctx.ok({ data: logs })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getMyCompanyMemberAuditLogsPaginated = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TMemberAuditLogsQuery, TMemberIdParam>(c)

    try {
      if (!this.membersRepository || !this.auditLogsRepository) {
        return ctx.badRequest({ error: 'Required repositories not configured' })
      }

      const member = await this.membersRepository.getById(ctx.params.memberId)
      if (!member || member.managementCompanyId !== ctx.params.managementCompanyId) {
        return ctx.notFound({ error: 'Member not found' })
      }

      const result = await this.auditLogsRepository.getByTableAndRecordPaginated(
        'management_company_members',
        ctx.params.memberId,
        ctx.query
      )

      return ctx.ok(result)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getMyCompanyMemberAuditLogDetail = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TMemberAuditLogIdParam>(c)

    try {
      if (!this.membersRepository || !this.auditLogsRepository) {
        return ctx.badRequest({ error: 'Required repositories not configured' })
      }

      const member = await this.membersRepository.getById(ctx.params.memberId)
      if (!member || member.managementCompanyId !== ctx.params.managementCompanyId) {
        return ctx.notFound({ error: 'Member not found' })
      }

      const log = await this.auditLogsRepository.getById(ctx.params.logId)
      if (
        !log ||
        log.tableName !== 'management_company_members' ||
        log.recordId !== ctx.params.memberId
      ) {
        return ctx.notFound({ error: 'Audit log not found' })
      }

      return ctx.ok({ data: log })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getMyCompanyPreferredCurrency = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { managementCompanyId: string }>(c)

    try {
      const company = await this.managementCompaniesRepository.getById(
        ctx.params.managementCompanyId
      )
      if (!company) {
        return ctx.notFound({ error: 'Management company not found' })
      }

      let currency = null
      if (company.preferredCurrencyId && this.currenciesRepository) {
        currency = await this.currenciesRepository.getById(company.preferredCurrencyId)
      }

      return ctx.ok({
        data: {
          preferredCurrencyId: company.preferredCurrencyId,
          currency,
        },
      })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private updateMyCompanyPreferredCurrency = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TPreferredCurrencyBody, unknown, { managementCompanyId: string }>(c)

    try {
      if (!this.currenciesRepository) {
        return ctx.badRequest({ error: 'Currencies repository not configured' })
      }

      const service = new UpdatePreferredCurrencyService(
        this.managementCompaniesRepository,
        this.currenciesRepository
      )

      const result = await service.execute({
        managementCompanyId: ctx.params.managementCompanyId,
        currencyId: ctx.body.currencyId,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

}
