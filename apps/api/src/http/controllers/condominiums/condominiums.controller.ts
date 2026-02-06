import type { Context } from 'hono'
import {
  condominiumCreateSchema,
  condominiumUpdateSchema,
  condominiumsQuerySchema,
  type TCondominium,
  type TCondominiumCreate,
  type TCondominiumUpdate,
  type TCondominiumsQuerySchema,
} from '@packages/domain'
import type {
  CondominiumsRepository,
  ManagementCompanySubscriptionsRepository,
  ManagementCompaniesRepository,
  LocationsRepository,
  CurrenciesRepository,
  UsersRepository,
} from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware } from '../../middlewares/auth'
import { validateSubscriptionLimit } from '../../middlewares/utils/validate-subscription-limit'
import { IdParamSchema, CodeParamSchema, type TCodeParam } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import {
  GetCondominiumByCodeService,
  GetCondominiumsByLocationService,
  GenerateCondominiumCodeService,
  GetCondominiumUsersService,
} from '@src/services/condominiums'
import type { TDrizzleClient } from '@database/repositories/interfaces'

const ManagementCompanyIdParamSchema = z.object({
  managementCompanyId: z.string().uuid('Invalid management company ID format'),
})

type TManagementCompanyIdParam = z.infer<typeof ManagementCompanyIdParamSchema>

const LocationIdParamSchema = z.object({
  locationId: z.string().uuid('Invalid location ID format'),
})

type TLocationIdParam = z.infer<typeof LocationIdParamSchema>

/**
 * Controller for managing condominium resources.
 *
 * Endpoints:
 * - GET    /                                    List all condominiums
 * - GET    /code/:code                          Get by code
 * - GET    /management-company/:managementCompanyId  Get by management company
 * - GET    /location/:locationId                Get by location
 * - GET    /:id                                 Get by ID
 * - GET    /:id/users                           Get users of condominium
 * - POST   /                                    Create condominium
 * - PATCH  /:id                                 Update condominium
 * - DELETE /:id                                 Delete condominium
 */
export class CondominiumsController extends BaseController<
  TCondominium,
  TCondominiumCreate,
  TCondominiumUpdate
> {
  private readonly getCondominiumByCodeService: GetCondominiumByCodeService
  private readonly getCondominiumsByLocationService: GetCondominiumsByLocationService
  private readonly generateCondominiumCodeService: GenerateCondominiumCodeService
  private readonly getCondominiumUsersService: GetCondominiumUsersService
  private readonly subscriptionsRepository: ManagementCompanySubscriptionsRepository
  private readonly companiesRepository: ManagementCompaniesRepository
  private readonly locationsRepository: LocationsRepository
  private readonly currenciesRepository: CurrenciesRepository
  private readonly usersRepository: UsersRepository

  constructor(
    repository: CondominiumsRepository,
    subscriptionsRepository: ManagementCompanySubscriptionsRepository,
    companiesRepository: ManagementCompaniesRepository,
    locationsRepository: LocationsRepository,
    currenciesRepository: CurrenciesRepository,
    usersRepository: UsersRepository,
    db: TDrizzleClient
  ) {
    super(repository)

    // Store repositories for middleware use and population
    this.subscriptionsRepository = subscriptionsRepository
    this.companiesRepository = companiesRepository
    this.locationsRepository = locationsRepository
    this.currenciesRepository = currenciesRepository
    this.usersRepository = usersRepository

    // Initialize services
    this.getCondominiumByCodeService = new GetCondominiumByCodeService(repository)
    this.getCondominiumsByLocationService = new GetCondominiumsByLocationService(repository)
    this.generateCondominiumCodeService = new GenerateCondominiumCodeService(repository)
    this.getCondominiumUsersService = new GetCondominiumUsersService(db)

    this.listPaginated = this.listPaginated.bind(this)
    this.getByCode = this.getByCode.bind(this)
    this.getByManagementCompanyId = this.getByManagementCompanyId.bind(this)
    this.getByLocationId = this.getByLocationId.bind(this)
    this.generateCode = this.generateCode.bind(this)
    this.getCondominiumUsers = this.getCondominiumUsers.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.listPaginated,
        middlewares: [authMiddleware, queryValidator(condominiumsQuerySchema)],
      },
      {
        method: 'get',
        path: '/code/:code',
        handler: this.getByCode,
        middlewares: [authMiddleware, paramsValidator(CodeParamSchema)],
      },
      {
        method: 'get',
        path: '/management-company/:managementCompanyId',
        handler: this.getByManagementCompanyId,
        middlewares: [
          authMiddleware,
          paramsValidator(ManagementCompanyIdParamSchema),
          queryValidator(condominiumsQuerySchema),
        ],
      },
      {
        method: 'get',
        path: '/location/:locationId',
        handler: this.getByLocationId,
        middlewares: [authMiddleware, paramsValidator(LocationIdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id/users',
        handler: this.getCondominiumUsers,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/generate-code',
        handler: this.generateCode,
        middlewares: [authMiddleware],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [
          authMiddleware,
          bodyValidator(condominiumCreateSchema),
          validateSubscriptionLimit('condominium', this.subscriptionsRepository, this.companiesRepository),
        ],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          paramsValidator(IdParamSchema),
          bodyValidator(condominiumUpdateSchema),
        ],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private async listPaginated(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TCondominiumsQuerySchema>(c)
    const repo = this.repository as CondominiumsRepository
    const result = await repo.listPaginated(ctx.query)
    return ctx.ok(result)
  }

  private async getByCode(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TCodeParam>(c)

    try {
      const result = await this.getCondominiumByCodeService.execute({
        code: ctx.params.code,
      })

      if (!result.success) {
        return ctx.notFound({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByManagementCompanyId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TCondominiumsQuerySchema, TManagementCompanyIdParam>(c)
    const repo = this.repository as CondominiumsRepository

    try {
      const result = await repo.listByManagementCompanyPaginated(
        ctx.params.managementCompanyId,
        ctx.query
      )

      return ctx.ok(result)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByLocationId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TLocationIdParam>(c)

    try {
      const result = await this.getCondominiumsByLocationService.execute({
        locationId: ctx.params.locationId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async generateCode(c: Context): Promise<Response> {
    const ctx = this.ctx(c)

    try {
      const result = await this.generateCondominiumCodeService.execute()

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getCondominiumUsers(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)

    try {
      const result = await this.getCondominiumUsersService.execute({
        condominiumId: ctx.params.id,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Override getById to populate relations
  // ─────────────────────────────────────────────────────────────────────────────

  protected override getById = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)

    try {
      // Include inactive condominiums for viewing purposes
      const condominium = await this.repository.getById(ctx.params.id, true)

      if (!condominium) {
        return ctx.notFound({ error: 'Condominium not found' })
      }

      // Populate relations
      const [managementCompanies, location, defaultCurrency, createdByUser] = await Promise.all([
        // Get management companies (include inactive to show historical relationships)
        condominium.managementCompanyIds.length > 0
          ? Promise.all(condominium.managementCompanyIds.map(id => this.companiesRepository.getById(id, true)))
          : Promise.resolve([]),
        // Get location with full hierarchy (country -> province -> city)
        condominium.locationId ? this.locationsRepository.getByIdWithHierarchy(condominium.locationId) : Promise.resolve(null),
        // Get currency
        condominium.defaultCurrencyId ? this.currenciesRepository.getById(condominium.defaultCurrencyId) : Promise.resolve(null),
        // Get created by user (include inactive users to show who created it)
        condominium.createdBy ? this.usersRepository.getById(condominium.createdBy, true) : Promise.resolve(null),
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

      const populated: TCondominium = {
        ...condominium,
        managementCompanies: managementCompanies.filter(c => c !== null),
        location: location ?? undefined,
        defaultCurrency: defaultCurrency ?? undefined,
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
    const ctx = this.ctx<TCondominiumCreate>(c)
    const user = ctx.getAuthenticatedUser()

    const entity = await this.repository.create({
      ...ctx.body,
      createdBy: user.id,
    })

    return ctx.created({ data: entity })
  }
}
