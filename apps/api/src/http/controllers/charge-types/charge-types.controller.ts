import type { Context } from 'hono'
import { z } from 'zod'
import { ESystemRole, type TChargeType } from '@packages/domain'
import type { ChargeTypesRepository } from '@database/repositories'
import { AppError } from '@errors/index'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { safeTranslation } from '@locales/safe-translation'

// ─── Schemas ──────────────────────────────────────────────────────────

const ChargeTypeCreateBodySchema = z.object({
  condominiumId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  categoryId: z.string().uuid(),
  sortOrder: z.number().int().optional(),
})

const ChargeTypeUpdateBodySchema = ChargeTypeCreateBodySchema.partial()

// ─── Controller ──────────────────────────────────────────────────────────

export class ChargeTypesController extends BaseController<
  TChargeType,
  any,
  any
> {
  private readonly chargeTypesRepo: ChargeTypesRepository

  constructor(repository: ChargeTypesRepository) {
    super(repository)
    this.chargeTypesRepo = repository
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.list,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
        ],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(IdParamSchema),
        ],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN),
          bodyValidator(ChargeTypeCreateBodySchema),
        ],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN),
          paramsValidator(IdParamSchema),
          bodyValidator(ChargeTypeUpdateBodySchema),
        ],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN),
          paramsValidator(IdParamSchema),
        ],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Overridden Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  protected override list = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const data = await this.chargeTypesRepo.listByCondominium(condominiumId)
    return ctx.ok({ data })
  }

  protected override getById = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const entity = await this.repository.getById(ctx.params.id)
    if (!entity) throw AppError.notFound('Tipo de cargo', ctx.params.id)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    if (condominiumId && entity.condominiumId !== condominiumId) {
      throw AppError.notFound('Tipo de cargo', ctx.params.id)
    }
    return ctx.ok({ data: entity })
  }

  protected override create = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<z.infer<typeof ChargeTypeCreateBodySchema>>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP) || ctx.body.condominiumId
    if (!condominiumId) {
      const t = safeTranslation(c)
      return ctx.badRequest({ error: t('errors.condominiumIdRequired') })
    }
    const entity = await this.repository.create({
      condominiumId,
      name: ctx.body.name,
      categoryId: ctx.body.categoryId,
      sortOrder: ctx.body.sortOrder ?? 0,
      isActive: true,
    })
    return ctx.created({ data: entity })
  }

  protected override update = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<z.infer<typeof ChargeTypeUpdateBodySchema>, unknown, { id: string }>(c)
    const existing = await this.repository.getById(ctx.params.id)
    if (!existing) throw AppError.notFound('Tipo de cargo', ctx.params.id)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    if (condominiumId && existing.condominiumId !== condominiumId) {
      throw AppError.notFound('Tipo de cargo', ctx.params.id)
    }
    const entity = await this.repository.update(ctx.params.id, ctx.body)
    if (!entity) throw AppError.notFound('Tipo de cargo', ctx.params.id)
    return ctx.ok({ data: entity })
  }

  protected override delete = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const existing = await this.repository.getById(ctx.params.id)
    if (!existing) throw AppError.notFound('Tipo de cargo', ctx.params.id)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    if (condominiumId && existing.condominiumId !== condominiumId) {
      throw AppError.notFound('Tipo de cargo', ctx.params.id)
    }
    // Soft delete: set isActive=false
    await this.repository.update(ctx.params.id, { isActive: false })
    return ctx.noContent()
  }
}
