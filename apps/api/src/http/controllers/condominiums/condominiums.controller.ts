import type { Context } from 'hono'
import {
  condominiumCreateSchema,
  condominiumUpdateSchema,
  type TCondominium,
  type TCondominiumCreate,
  type TCondominiumUpdate,
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
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { validateSubscriptionLimit } from '../../middlewares/utils/validate-subscription-limit'
import { IdParamSchema, CodeParamSchema, type TCodeParam } from '../common'
import type { TRouteDefinition } from '../types'
import {
  GetCondominiumByCodeService,
  GenerateCondominiumCodeService,
  GetCondominiumUsersService,
} from '@src/services/condominiums'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { AppError } from '@errors/index'

/**
 * Controller for managing condominium resources.
 *
 * Under the /condominium/condominiums path, this controller is condominium-scoped.
 * The list() endpoint returns only the current condominium from the context
 * (set by requireRole() middleware).
 *
 * Endpoints:
 * - GET    /                                    Get current condominium
 * - GET    /code/:code                          Get by code
 * - GET    /:id                                 Get by ID
 * - GET    /:id/users                           Get users of condominium
 * - POST   /generate-code                       Generate a new code
 * - POST   /                                    Create condominium
 * - PATCH  /:id                                 Update condominium
 * - DELETE /:id                                 Delete condominium
 */
export class CondominiumsController extends BaseController<
  TCondominium,
  TCondominiumCreate,
  TCondominiumUpdate
> {
  private readonly condominiumsRepository: CondominiumsRepository
  private readonly getCondominiumByCodeService: GetCondominiumByCodeService
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

    // Store concrete repository for email uniqueness checks
    this.condominiumsRepository = repository

    // Store repositories for middleware use and population
    this.subscriptionsRepository = subscriptionsRepository
    this.companiesRepository = companiesRepository
    this.locationsRepository = locationsRepository
    this.currenciesRepository = currenciesRepository
    this.usersRepository = usersRepository

    // Initialize services
    this.getCondominiumByCodeService = new GetCondominiumByCodeService(repository)
    this.generateCondominiumCodeService = new GenerateCondominiumCodeService(repository)
    this.getCondominiumUsersService = new GetCondominiumUsersService(db)

  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.list,
        middlewares: [authMiddleware, requireRole('ADMIN', 'ACCOUNTANT', 'SUPPORT', 'USER')],
      },
      {
        method: 'get',
        path: '/code/:code',
        handler: this.getByCode,
        middlewares: [authMiddleware, requireRole('ADMIN'), paramsValidator(CodeParamSchema)],
      },
      {
        method: 'get',
        path: '/:id/users',
        handler: this.getCondominiumUsers,
        middlewares: [authMiddleware, requireRole('SUPERADMIN', 'ADMIN'), paramsValidator(IdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole('SUPERADMIN', 'ADMIN', 'ACCOUNTANT', 'SUPPORT', 'USER'), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/generate-code',
        handler: this.generateCode,
        middlewares: [authMiddleware, requireRole('SUPERADMIN')],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [
          authMiddleware,
          requireRole('SUPERADMIN', 'ADMIN'),
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
          requireRole('ADMIN'),
          paramsValidator(IdParamSchema),
          bodyValidator(condominiumUpdateSchema),
        ],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, requireRole('ADMIN'), paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Override list to return only the current condominium from context
  // ─────────────────────────────────────────────────────────────────────────────

  protected override list = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const condominium = await this.repository.getById(condominiumId)
    if (!condominium) throw AppError.notFound('Condominium', condominiumId)
    return ctx.ok({ data: [condominium] })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private getByCode = async (c: Context): Promise<Response> => {
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

  private generateCode = async (c: Context): Promise<Response> => {
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

  private getCondominiumUsers = async (c: Context): Promise<Response> => {
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
  // Shared: populate condominium relations
  // ─────────────────────────────────────────────────────────────────────────────

  private async populateCondominium(condominium: TCondominium): Promise<TCondominium> {
    const [managementCompanies, location, defaultCurrency, createdByUser] = await Promise.all([
      condominium.managementCompanyIds.length > 0
        ? Promise.all(condominium.managementCompanyIds.map(id => this.companiesRepository.getById(id, true)))
        : Promise.resolve([]),
      condominium.locationId ? this.locationsRepository.getByIdWithHierarchy(condominium.locationId) : Promise.resolve(null),
      condominium.defaultCurrencyId ? this.currenciesRepository.getById(condominium.defaultCurrencyId) : Promise.resolve(null),
      condominium.createdBy ? this.usersRepository.getById(condominium.createdBy, true) : Promise.resolve(null),
    ])

    let enrichedCreatedByUser = createdByUser
    if (createdByUser) {
      const isSuperadmin = await this.usersRepository.checkIsSuperadmin(createdByUser.id)
      enrichedCreatedByUser = { ...createdByUser, isSuperadmin }
    }

    return {
      ...condominium,
      managementCompanies: managementCompanies.filter(c => c !== null),
      location: location ?? undefined,
      defaultCurrency: defaultCurrency ?? undefined,
      createdByUser: enrichedCreatedByUser ?? undefined,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Override getById to populate relations
  // ─────────────────────────────────────────────────────────────────────────────

  protected override getById = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)

    try {
      const condominium = await this.repository.getById(ctx.params.id, true)

      if (!condominium) {
        return ctx.notFound({ error: 'Condominium not found' })
      }

      const populated = await this.populateCondominium(condominium)
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

    if (ctx.body.email) {
      const existingByEmail = await this.condominiumsRepository.getByEmail(ctx.body.email)
      if (existingByEmail) {
        throw AppError.alreadyExists('Condominium', 'email')
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
    const ctx = this.ctx<TCondominiumUpdate, unknown, { id: string }>(c)

    if (ctx.body.email) {
      const existingByEmail = await this.condominiumsRepository.getByEmail(ctx.body.email)
      if (existingByEmail && existingByEmail.id !== ctx.params.id) {
        throw AppError.alreadyExists('Condominium', 'email')
      }
    }

    const entity = await this.repository.update(ctx.params.id, ctx.body)
    if (!entity) {
      throw AppError.notFound('Condominium', ctx.params.id)
    }

    return ctx.ok({ data: entity })
  }
}
