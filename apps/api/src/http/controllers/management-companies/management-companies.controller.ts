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
import type { ManagementCompaniesRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'

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
  constructor(repository: ManagementCompaniesRepository) {
    super(repository)
    this.listPaginated = this.listPaginated.bind(this)
    this.getByTaxIdNumber = this.getByTaxIdNumber.bind(this)
    this.getByLocationId = this.getByLocationId.bind(this)
    this.toggleActive = this.toggleActive.bind(this)
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
}
