import type { Context } from 'hono'
import {
  managementCompanyCreateSchema,
  managementCompanyUpdateSchema,
  managementCompaniesQuerySchema,
  type TManagementCompany,
  type TManagementCompanyCreate,
  type TManagementCompanyUpdate,
  type TManagementCompaniesQuerySchema,
} from '@packages/domain'
import type {
  ManagementCompaniesRepository,
  ManagementCompanySubscriptionsRepository,
  LocationsRepository,
  UsersRepository,
} from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import { ValidateSubscriptionLimitsService, type TResourceType } from '@src/services/subscriptions'

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
  private readonly validateLimitsService: ValidateSubscriptionLimitsService
  private readonly locationsRepository: LocationsRepository
  private readonly usersRepository: UsersRepository

  constructor(
    repository: ManagementCompaniesRepository,
    subscriptionsRepository: ManagementCompanySubscriptionsRepository,
    locationsRepository: LocationsRepository,
    usersRepository: UsersRepository
  ) {
    super(repository)
    this.locationsRepository = locationsRepository
    this.usersRepository = usersRepository
    this.validateLimitsService = new ValidateSubscriptionLimitsService(
      subscriptionsRepository,
      repository
    )
    this.listPaginated = this.listPaginated.bind(this)
    this.getByTaxIdNumber = this.getByTaxIdNumber.bind(this)
    this.getByLocationId = this.getByLocationId.bind(this)
    this.toggleActive = this.toggleActive.bind(this)
    this.getUsageStats = this.getUsageStats.bind(this)
    this.checkCanCreateResource = this.checkCanCreateResource.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.listPaginated,
        middlewares: [queryValidator(managementCompaniesQuerySchema)],
      },
      {
        method: 'get',
        path: '/tax-id-number/:taxIdNumber',
        handler: this.getByTaxIdNumber,
        middlewares: [paramsValidator(TaxIdNumberParamSchema)],
      },
      {
        method: 'get',
        path: '/location/:locationId',
        handler: this.getByLocationId,
        middlewares: [paramsValidator(LocationIdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [paramsValidator(IdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id/usage-stats',
        handler: this.getUsageStats,
        middlewares: [paramsValidator(IdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id/subscription/can-create/:resourceType',
        handler: this.checkCanCreateResource,
        middlewares: [paramsValidator(CheckLimitParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [bodyValidator(managementCompanyCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(managementCompanyUpdateSchema)],
      },
      {
        method: 'patch',
        path: '/:id/toggle-active',
        handler: this.toggleActive,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(ToggleActiveBodySchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [paramsValidator(IdParamSchema)],
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

    const entity = await this.repository.create({
      ...ctx.body,
      createdBy: user.id,
    })

    return ctx.created({ data: entity })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private async listPaginated(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TManagementCompaniesQuerySchema>(c)
    const repo = this.repository as ManagementCompaniesRepository
    const result = await repo.listPaginated(ctx.query)
    return ctx.ok(result)
  }

  private async toggleActive(c: Context): Promise<Response> {
    const ctx = this.ctx<TToggleActiveBody, unknown, { id: string }>(c)
    const repo = this.repository as ManagementCompaniesRepository
    const company = await repo.toggleActive(ctx.params.id, ctx.body.isActive)

    if (!company) {
      return ctx.notFound({ error: 'Management company not found' })
    }

    return ctx.ok({ data: company })
  }

  private async getByTaxIdNumber(c: Context): Promise<Response> {
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

  private async getByLocationId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TLocationIdParam>(c)
    const repo = this.repository as ManagementCompaniesRepository

    try {
      const companies = await repo.getByLocationId(ctx.params.locationId)
      return ctx.ok({ data: companies })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getUsageStats(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const repo = this.repository as ManagementCompaniesRepository

    try {
      const stats = await repo.getUsageStats(ctx.params.id)
      return ctx.ok({ data: stats })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async checkCanCreateResource(c: Context): Promise<Response> {
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
}
