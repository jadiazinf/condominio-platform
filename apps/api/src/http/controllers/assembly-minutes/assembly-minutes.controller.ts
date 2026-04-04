import type { Context } from 'hono'
import { z } from 'zod'
import {
  ESystemRole,
  type TAssemblyMinute,
  type TAssemblyMinuteCreate,
  type TAssemblyMinuteUpdate,
  EAssemblyTypes,
  EAssemblyMinuteStatuses,
} from '@packages/domain'
import type { AssemblyMinutesRepository } from '@database/repositories'
import { AppError } from '@errors/index'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'

// ─── Schemas ──────────────────────────────────────────────────────────

const AssemblyMinuteCreateBodySchema = z.object({
  title: z.string().min(1),
  assemblyType: z.enum(EAssemblyTypes),
  assemblyDate: z.string(),
  assemblyLocation: z.string().nullable().optional(),
  quorumPercentage: z.string().nullable().optional(),
  attendeesCount: z.number().int().nullable().optional(),
  totalUnits: z.number().int().nullable().optional(),
  agenda: z.string().nullable().optional(),
  decisions: z.record(z.string(), z.unknown()).nullable().optional(),
  notes: z.string().nullable().optional(),
  documentUrl: z.string().nullable().optional(),
  documentFileName: z.string().nullable().optional(),
  status: z.enum(EAssemblyMinuteStatuses).optional(),
})

const AssemblyMinuteUpdateBodySchema = AssemblyMinuteCreateBodySchema.partial()

// ─── Controller ──────────────────────────────────────────────────────────

export class AssemblyMinutesController extends BaseController<
  TAssemblyMinute,
  TAssemblyMinuteCreate,
  TAssemblyMinuteUpdate
> {
  private readonly assemblyMinutesRepo: AssemblyMinutesRepository

  constructor(repository: AssemblyMinutesRepository) {
    super(repository)
    this.assemblyMinutesRepo = repository
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.list,
        middlewares: [
          authMiddleware,
          requireRole(
            ESystemRole.ADMIN,
            ESystemRole.ACCOUNTANT,
            ESystemRole.SUPPORT,
            ESystemRole.VIEWER,
            ESystemRole.USER
          ),
        ],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [
          authMiddleware,
          requireRole(
            ESystemRole.ADMIN,
            ESystemRole.ACCOUNTANT,
            ESystemRole.SUPPORT,
            ESystemRole.VIEWER,
            ESystemRole.USER
          ),
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
          bodyValidator(AssemblyMinuteCreateBodySchema),
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
          bodyValidator(AssemblyMinuteUpdateBodySchema),
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
    const data = await this.assemblyMinutesRepo.findByCondominium(condominiumId)
    return ctx.ok({ data })
  }

  protected override getById = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const entity = await this.repository.getById(ctx.params.id)
    if (!entity) throw AppError.notFound('Acta de asamblea', ctx.params.id)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    if (condominiumId && entity.condominiumId !== condominiumId) {
      throw AppError.notFound('Acta de asamblea', ctx.params.id)
    }
    return ctx.ok({ data: entity })
  }

  protected override create = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<z.infer<typeof AssemblyMinuteCreateBodySchema>>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const createdBy = c.get('userId') as string | undefined
    const entity = await this.repository.create({
      ...ctx.body,
      condominiumId,
      isActive: true,
      createdBy: createdBy ?? null,
      assemblyLocation: ctx.body.assemblyLocation ?? null,
      quorumPercentage: ctx.body.quorumPercentage ?? null,
      attendeesCount: ctx.body.attendeesCount ?? null,
      totalUnits: ctx.body.totalUnits ?? null,
      agenda: ctx.body.agenda ?? null,
      decisions: ctx.body.decisions ?? null,
      notes: ctx.body.notes ?? null,
      documentUrl: ctx.body.documentUrl ?? null,
      documentFileName: ctx.body.documentFileName ?? null,
    } as TAssemblyMinuteCreate)
    return ctx.created({ data: entity })
  }

  protected override update = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TAssemblyMinuteUpdate, unknown, { id: string }>(c)
    const existing = await this.repository.getById(ctx.params.id)
    if (!existing) throw AppError.notFound('Acta de asamblea', ctx.params.id)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    if (condominiumId && existing.condominiumId !== condominiumId) {
      throw AppError.notFound('Acta de asamblea', ctx.params.id)
    }
    const entity = await this.repository.update(ctx.params.id, ctx.body)
    if (!entity) throw AppError.notFound('Acta de asamblea', ctx.params.id)
    return ctx.ok({ data: entity })
  }

  protected override delete = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const existing = await this.repository.getById(ctx.params.id)
    if (!existing) throw AppError.notFound('Acta de asamblea', ctx.params.id)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    if (condominiumId && existing.condominiumId !== condominiumId) {
      throw AppError.notFound('Acta de asamblea', ctx.params.id)
    }
    const success = await this.repository.delete(ctx.params.id)
    if (!success) throw AppError.notFound('Acta de asamblea', ctx.params.id)
    return ctx.noContent()
  }
}
