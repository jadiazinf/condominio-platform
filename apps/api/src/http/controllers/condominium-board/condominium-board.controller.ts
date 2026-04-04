import type { Context } from 'hono'
import { z } from 'zod'
import {
  ESystemRole,
  type TCondominiumBoardMember,
  type TCondominiumBoardMemberCreate,
  type TCondominiumBoardMemberUpdate,
  EBoardPositions,
  EBoardMemberStatuses,
} from '@packages/domain'
import type { CondominiumBoardMembersRepository } from '@database/repositories'
import { AppError } from '@errors/index'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'

// ─── Schemas ──────────────────────────────────────────────────────────

const BoardMemberCreateBodySchema = z.object({
  userId: z.string().uuid(),
  position: z.enum(EBoardPositions),
  electedAt: z.string(),
  termEndsAt: z.string().nullable().optional(),
  assemblyMinuteId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(EBoardMemberStatuses).optional(),
})

const BoardMemberUpdateBodySchema = BoardMemberCreateBodySchema.partial()

// ─── Controller ──────────────────────────────────────────────────────────

export class CondominiumBoardController extends BaseController<
  TCondominiumBoardMember,
  TCondominiumBoardMemberCreate,
  TCondominiumBoardMemberUpdate
> {
  private readonly boardRepo: CondominiumBoardMembersRepository

  constructor(repository: CondominiumBoardMembersRepository) {
    super(repository)
    this.boardRepo = repository
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
          bodyValidator(BoardMemberCreateBodySchema),
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
          bodyValidator(BoardMemberUpdateBodySchema),
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
    const data = await this.boardRepo.findByCondominium(condominiumId)
    return ctx.ok({ data })
  }

  protected override getById = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const entity = await this.repository.getById(ctx.params.id)
    if (!entity) throw AppError.notFound('Miembro de junta', ctx.params.id)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    if (condominiumId && entity.condominiumId !== condominiumId) {
      throw AppError.notFound('Miembro de junta', ctx.params.id)
    }
    return ctx.ok({ data: entity })
  }

  protected override create = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<z.infer<typeof BoardMemberCreateBodySchema>>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const createdBy = c.get('userId') as string | undefined
    const entity = await this.repository.create({
      ...ctx.body,
      condominiumId,
      createdBy: createdBy ?? null,
      status: ctx.body.status ?? 'active',
      termEndsAt: ctx.body.termEndsAt ?? null,
      assemblyMinuteId: ctx.body.assemblyMinuteId ?? null,
      notes: ctx.body.notes ?? null,
    } as TCondominiumBoardMemberCreate)
    return ctx.created({ data: entity })
  }

  protected override update = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TCondominiumBoardMemberUpdate, unknown, { id: string }>(c)
    const existing = await this.repository.getById(ctx.params.id)
    if (!existing) throw AppError.notFound('Miembro de junta', ctx.params.id)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    if (condominiumId && existing.condominiumId !== condominiumId) {
      throw AppError.notFound('Miembro de junta', ctx.params.id)
    }
    const entity = await this.repository.update(ctx.params.id, ctx.body)
    if (!entity) throw AppError.notFound('Miembro de junta', ctx.params.id)
    return ctx.ok({ data: entity })
  }

  protected override delete = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const existing = await this.repository.getById(ctx.params.id)
    if (!existing) throw AppError.notFound('Miembro de junta', ctx.params.id)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    if (condominiumId && existing.condominiumId !== condominiumId) {
      throw AppError.notFound('Miembro de junta', ctx.params.id)
    }
    const success = await this.repository.delete(ctx.params.id)
    if (!success) throw AppError.notFound('Miembro de junta', ctx.params.id)
    return ctx.noContent()
  }
}
