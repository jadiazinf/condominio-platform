import type { Context } from 'hono'
import {
  quotaCreateSchema,
  quotaUpdateSchema,
  type TQuota,
  type TQuotaCreate,
  type TQuotaUpdate,
  ESystemRole,
} from '@packages/domain'
import type {
  QuotasRepository,
  QuotaAdjustmentsRepository,
  PaymentConceptsRepository,
  PaymentConceptServicesRepository,
  PaymentConceptAssignmentsRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { AdjustQuotaService } from '@src/services/quota-adjustments'
import { GenerateMissingQuotaService } from '@src/services/quotas/generate-missing-quota.service'
import { GenerateAllMissingQuotasService } from '@src/services/quotas/generate-all-missing-quotas.service'
import { GetConceptPreviewService } from '@src/services/quotas/get-concept-preview.service'
import { AppError } from '@errors/index'
import type { EventLogger } from '@packages/services'
import { BaseController } from '../base.controller'
import {
  bodyValidator,
  paramsValidator,
  queryValidator,
} from '../../middlewares/utils/payload-validator'
import {
  authMiddleware,
  requireRole,
  canAccessUnit,
  CONDOMINIUM_ID_PROP,
} from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { AUTHENTICATED_USER_PROP } from '../../middlewares/utils/auth/is-user-authenticated'
import { z } from 'zod'

const CancelQuotaBodySchema = z.object({
  reason: z.string().min(10, 'La razón debe tener al menos 10 caracteres'),
})

type TCancelQuotaBody = z.infer<typeof CancelQuotaBodySchema>

const GenerateMissingQuotaBodySchema = z.object({
  paymentConceptId: z.string().uuid(),
  periodYear: z.number().int().min(2000).max(2100),
  periodMonth: z.number().int().min(1).max(12),
})

type TGenerateMissingQuotaBody = z.infer<typeof GenerateMissingQuotaBodySchema>

const GenerateAllMissingQuotasBodySchema = z.object({
  paymentConceptId: z.string().uuid(),
  periodYear: z.number().int().min(2000).max(2100),
})

type TGenerateAllMissingQuotasBody = z.infer<typeof GenerateAllMissingQuotasBodySchema>

const UnitIdParamSchema = z.object({
  unitId: z.string().uuid('Invalid unit ID format'),
})

type TUnitIdParam = z.infer<typeof UnitIdParamSchema>

const UnitConceptParamSchema = z.object({
  unitId: z.string().uuid('Invalid unit ID format'),
  conceptId: z.string().uuid('Invalid concept ID format'),
})

type TUnitConceptParam = z.infer<typeof UnitConceptParamSchema>

const StatusParamSchema = z.object({
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']),
})

type TStatusParam = z.infer<typeof StatusParamSchema>

const DateParamSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
})

type TDateParam = z.infer<typeof DateParamSchema>

const PaginatedByUnitQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  status: z.enum(['pending', 'partial', 'paid', 'overdue', 'cancelled', 'exonerated']).optional(),
  conceptId: z.string().uuid().optional(),
})

type TPaginatedByUnitQuery = z.infer<typeof PaginatedByUnitQuerySchema>

const PeriodQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
})

type TPeriodQuery = z.infer<typeof PeriodQuerySchema>

export class QuotasController extends BaseController<TQuota, TQuotaCreate, TQuotaUpdate> {
  private readonly quotasRepository: QuotasRepository
  private readonly adjustQuotaService: AdjustQuotaService
  private readonly generateMissingQuotaService: GenerateMissingQuotaService
  private readonly generateAllMissingQuotasService: GenerateAllMissingQuotasService
  private readonly getConceptPreviewService: GetConceptPreviewService
  private readonly dbRef: TDrizzleClient
  private readonly unitOwnershipsRepo?: {
    getRegisteredByUnitIds: (
      unitIds: string[]
    ) => Promise<Array<{ userId: string | null; unitId: string }>>
  }
  private readonly currenciesRepoRef?: {
    getById: (
      id: string
    ) => Promise<{ id: string; code: string; symbol: string | null; name: string } | null>
  }

  constructor(
    repository: QuotasRepository,
    private readonly paymentConceptsRepo: PaymentConceptsRepository,
    private readonly conceptServicesRepo: PaymentConceptServicesRepository | undefined,
    db: TDrizzleClient,
    quotaAdjustmentsRepo: QuotaAdjustmentsRepository,
    assignmentsRepo: PaymentConceptAssignmentsRepository,
    unitsRepo: {
      getByCondominiumId: (id: string) => Promise<unknown[]>
      getByBuildingId: (id: string) => Promise<unknown[]>
      getById: (id: string) => Promise<unknown | null>
    },
    buildingsRepo?: {
      getById: (id: string) => Promise<{ id: string; condominiumId: string } | null>
    },
    currenciesRepo?: {
      getById: (
        id: string
      ) => Promise<{ id: string; code: string; symbol: string | null; name: string } | null>
    },
    unitOwnershipsRepo?: {
      getRegisteredByUnitIds: (
        unitIds: string[]
      ) => Promise<Array<{ userId: string | null; unitId: string }>>
    },
    eventLogger?: EventLogger
  ) {
    super(repository)
    this.quotasRepository = repository
    this.dbRef = db
    this.adjustQuotaService = new AdjustQuotaService(
      db,
      repository,
      quotaAdjustmentsRepo,
      eventLogger
    )
    this.generateMissingQuotaService = new GenerateMissingQuotaService(
      db,
      paymentConceptsRepo,
      assignmentsRepo,
      unitsRepo as never,
      repository,
      eventLogger
    )
    this.generateAllMissingQuotasService = new GenerateAllMissingQuotasService(
      db,
      paymentConceptsRepo,
      assignmentsRepo,
      unitsRepo as never,
      repository
    )
    this.getConceptPreviewService = new GetConceptPreviewService(
      paymentConceptsRepo,
      assignmentsRepo,
      unitsRepo as never,
      currenciesRepo ?? { getById: async () => null }
    )
    this.unitOwnershipsRepo = unitOwnershipsRepo
    this.currenciesRepoRef = currenciesRepo
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.list,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT)],
      },
      {
        method: 'get',
        path: '/unit/:unitId',
        handler: this.getByUnitId,
        middlewares: [
          authMiddleware,
          requireRole(
            ESystemRole.ADMIN,
            ESystemRole.ACCOUNTANT,
            ESystemRole.SUPPORT,
            ESystemRole.USER
          ),
          paramsValidator(UnitIdParamSchema),
          canAccessUnit(),
        ],
      },
      {
        method: 'get',
        path: '/unit/:unitId/paginated',
        handler: this.getByUnitIdPaginated,
        middlewares: [
          authMiddleware,
          requireRole(
            ESystemRole.ADMIN,
            ESystemRole.ACCOUNTANT,
            ESystemRole.SUPPORT,
            ESystemRole.USER
          ),
          paramsValidator(UnitIdParamSchema),
          queryValidator(PaginatedByUnitQuerySchema),
          canAccessUnit(),
        ],
      },
      {
        method: 'get',
        path: '/unit/:unitId/concepts',
        handler: this.getDistinctConceptsByUnit,
        middlewares: [
          authMiddleware,
          requireRole(
            ESystemRole.ADMIN,
            ESystemRole.ACCOUNTANT,
            ESystemRole.SUPPORT,
            ESystemRole.USER
          ),
          paramsValidator(UnitIdParamSchema),
          canAccessUnit(),
        ],
      },
      {
        method: 'get',
        path: '/unit/:unitId/pending',
        handler: this.getPendingByUnit,
        middlewares: [
          authMiddleware,
          requireRole(
            ESystemRole.ADMIN,
            ESystemRole.ACCOUNTANT,
            ESystemRole.SUPPORT,
            ESystemRole.USER
          ),
          paramsValidator(UnitIdParamSchema),
          canAccessUnit(),
        ],
      },
      {
        method: 'get',
        path: '/status/:status',
        handler: this.getByStatus,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(StatusParamSchema),
        ],
      },
      {
        method: 'get',
        path: '/overdue/:date',
        handler: this.getOverdue,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(DateParamSchema),
        ],
      },
      {
        method: 'get',
        path: '/period',
        handler: this.getByPeriod,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          queryValidator(PeriodQuerySchema),
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
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          bodyValidator(quotaCreateSchema),
        ],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(IdParamSchema),
          bodyValidator(quotaUpdateSchema),
        ],
      },
      {
        method: 'post',
        path: '/unit/:unitId/generate',
        handler: this.generateMissingQuota,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(UnitIdParamSchema),
          bodyValidator(GenerateMissingQuotaBodySchema),
        ],
      },
      {
        method: 'get',
        path: '/unit/:unitId/concept-preview/:conceptId',
        handler: this.getConceptPreview,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(UnitConceptParamSchema),
        ],
      },
      {
        method: 'post',
        path: '/unit/:unitId/generate-all',
        handler: this.generateAllMissingQuotas,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(UnitIdParamSchema),
          bodyValidator(GenerateAllMissingQuotasBodySchema),
        ],
      },
      {
        method: 'post',
        path: '/:id/cancel',
        handler: this.cancelQuota,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(IdParamSchema),
          bodyValidator(CancelQuotaBodySchema),
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

  protected override getById = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const entity = await this.quotasRepository.getByIdWithRelations(ctx.params.id)
    if (!entity) throw AppError.notFound('Resource', ctx.params.id)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    if (condominiumId) {
      const concept = await this.paymentConceptsRepo.getById(entity.paymentConceptId)
      if (!concept || concept.condominiumId !== condominiumId) {
        throw AppError.notFound('Resource', ctx.params.id)
      }
    }
    // Enrich with concept services if available
    let services: unknown[] = []
    if (this.conceptServicesRepo) {
      services = await this.conceptServicesRepo.listByConceptId(entity.paymentConceptId)
    }
    return ctx.ok({ data: { ...entity, services } })
  }

  protected override list = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const entities = condominiumId
      ? await this.quotasRepository.listByCondominiumId(condominiumId)
      : await this.repository.listAll()
    return ctx.ok({ data: entities })
  }

  private getByUnitIdPaginated = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TPaginatedByUnitQuery, TUnitIdParam>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const result = await this.quotasRepository.listPaginatedByUnit(
      ctx.params.unitId,
      {
        page: ctx.query.page,
        limit: ctx.query.limit,
        startDate: ctx.query.startDate,
        endDate: ctx.query.endDate,
        status: ctx.query.status,
        conceptId: ctx.query.conceptId,
      },
      condominiumId
    )
    return ctx.ok(result)
  }

  private getByUnitId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUnitIdParam>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const data = await this.quotasRepository.getByUnitId(ctx.params.unitId, condominiumId)
    return ctx.ok({ data })
  }

  private getDistinctConceptsByUnit = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUnitIdParam>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const data = await this.quotasRepository.getDistinctConceptsByUnit(
      ctx.params.unitId,
      condominiumId
    )
    return ctx.ok({ data })
  }

  private getPendingByUnit = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUnitIdParam>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const data = await this.quotasRepository.getPendingByUnit(ctx.params.unitId, condominiumId)
    return ctx.ok({ data })
  }

  private getByStatus = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TStatusParam>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const data = await this.quotasRepository.getByStatus(ctx.params.status, condominiumId)
    return ctx.ok({ data })
  }

  private getOverdue = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TDateParam>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const data = await this.quotasRepository.getOverdue(ctx.params.date, condominiumId)
    return ctx.ok({ data })
  }

  private getByPeriod = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TPeriodQuery>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const data = await this.quotasRepository.getByPeriod(
      ctx.query.year,
      ctx.query.month,
      condominiumId
    )
    return ctx.ok({ data })
  }

  private generateMissingQuota = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TGenerateMissingQuotaBody, unknown, TUnitIdParam>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)

    // Tenant isolation: verify the concept belongs to the user's condominium
    if (condominiumId) {
      const concept = await this.paymentConceptsRepo.getById(ctx.body.paymentConceptId)
      if (!concept || concept.condominiumId !== condominiumId) {
        return ctx.notFound({ error: 'Concepto de pago no encontrado' })
      }
    }

    const result = await this.generateMissingQuotaService.execute({
      unitId: ctx.params.unitId,
      paymentConceptId: ctx.body.paymentConceptId,
      periodYear: ctx.body.periodYear,
      periodMonth: ctx.body.periodMonth,
      generatedBy: user.id,
    })

    if (!result.success) {
      if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
      if (result.code === 'CONFLICT') return ctx.conflict({ error: result.error })
      if (result.code === 'BAD_REQUEST') return ctx.badRequest({ error: result.error })
      return ctx.internalError({ error: result.error })
    }

    // Enqueue notification for the resident (fire-and-forget)
    this.notifyResidentForQuota({
      unitId: ctx.params.unitId,
      conceptId: ctx.body.paymentConceptId,
      quota: result.data.quota,
    }).catch(() => {})

    return ctx.created({ data: result.data.quota })
  }

  private getConceptPreview = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUnitConceptParam>(c)
    const result = await this.getConceptPreviewService.execute(
      ctx.params.unitId,
      ctx.params.conceptId
    )
    if (!result.success) {
      if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
      return ctx.internalError({ error: result.error })
    }
    return ctx.ok({ data: result.data })
  }

  private generateAllMissingQuotas = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TGenerateAllMissingQuotasBody, unknown, TUnitIdParam>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)

    // Tenant isolation: verify the concept belongs to the user's condominium
    if (condominiumId) {
      const concept = await this.paymentConceptsRepo.getById(ctx.body.paymentConceptId)
      if (!concept || concept.condominiumId !== condominiumId) {
        return ctx.notFound({ error: 'Concepto de pago no encontrado' })
      }
    }

    const result = await this.generateAllMissingQuotasService.execute({
      unitId: ctx.params.unitId,
      paymentConceptId: ctx.body.paymentConceptId,
      periodYear: ctx.body.periodYear,
      generatedBy: user.id,
    })

    if (!result.success) {
      if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
      if (result.code === 'BAD_REQUEST') return ctx.badRequest({ error: result.error })
      return ctx.internalError({ error: result.error })
    }

    // Enqueue notifications for each created quota (fire-and-forget)
    for (const quota of result.data.created) {
      this.notifyResidentForQuota({
        unitId: ctx.params.unitId,
        conceptId: ctx.body.paymentConceptId,
        quota,
      }).catch(() => {})
    }

    return ctx.ok({ data: result.data })
  }

  private cancelQuota = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TCancelQuotaBody, unknown, { id: string }>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)

    // Tenant isolation: verify the quota belongs to the user's condominium
    if (condominiumId) {
      const quota = await this.quotasRepository.getById(ctx.params.id)
      if (!quota) return ctx.notFound({ error: 'Cuota no encontrada' })
      const concept = await this.paymentConceptsRepo.getById(quota.paymentConceptId)
      if (!concept || concept.condominiumId !== condominiumId) {
        return ctx.notFound({ error: 'Cuota no encontrada' })
      }
    }

    const result = await this.adjustQuotaService.execute({
      quotaId: ctx.params.id,
      newAmount: '0',
      adjustmentType: 'waiver',
      reason: ctx.body.reason,
      adjustedByUserId: user.id,
    })

    if (!result.success) {
      if (result.code === 'NOT_FOUND') return ctx.notFound({ error: result.error })
      if (result.code === 'BAD_REQUEST') return ctx.badRequest({ error: result.error })
      return ctx.internalError({ error: result.error })
    }

    return ctx.ok({ data: result.data.adjustment, message: result.data.message })
  }

  /**
   * Notifies residents after a single quota is generated (flows 4 & 4b).
   * Also triggers receipt auto-generation for maintenance concepts.
   */
  private async notifyResidentForQuota(params: {
    unitId: string
    conceptId: string
    quota: TQuota
  }): Promise<void> {
    try {
      const concept = await this.paymentConceptsRepo.getById(params.conceptId)
      if (!concept) return

      const currency = this.currenciesRepoRef
        ? await this.currenciesRepoRef.getById(concept.currencyId)
        : null
      const currencyCode = currency?.code ?? ''
      const conceptName = concept.name ?? 'Cuota'

      const MONTH_NAMES = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
      ]
      const periodDescription = `${MONTH_NAMES[params.quota.periodMonth - 1]} ${params.quota.periodYear}`

      // Auto-generate receipt BEFORE notification so receiptId is available for PDF attachment
      let receiptId: string | undefined
      if (concept.condominiumId) {
        const { autoGenerateReceipts } =
          await import('@src/services/receipts/auto-generate-receipts.service')
        const { CondominiumReceiptsRepository, UnitsRepository, BuildingsRepository } =
          await import('@database/repositories')
        const db = this.dbRef
        const receiptResult = await autoGenerateReceipts(
          {
            receiptsRepo: new CondominiumReceiptsRepository(db),
            quotasRepo: this.quotasRepository,
            unitsRepo: new UnitsRepository(db),
            buildingsRepo: new BuildingsRepository(db),
          },
          {
            unitIds: [params.unitId],
            conceptType: concept.conceptType ?? 'other',
            condominiumId: concept.condominiumId,
            periodYear: params.quota.periodYear,
            periodMonth: params.quota.periodMonth,
            currencyId: concept.currencyId,
            generatedBy: params.quota.createdBy,
          }
        )
        receiptId = receiptResult.unitReceiptMap.get(params.unitId)
      }

      // Send notifications (with receiptId for PDF attachment and push channel)
      if (this.unitOwnershipsRepo) {
        const ownerships = await this.unitOwnershipsRepo.getRegisteredByUnitIds([params.unitId])
        if (ownerships.length > 0) {
          const { enqueueNotification } = await import('@src/queue/boss-client')

          const notifiedUsers = new Set<string>()
          for (const ownership of ownerships) {
            if (!ownership.userId || notifiedUsers.has(ownership.userId)) continue
            notifiedUsers.add(ownership.userId)

            const amount = params.quota.baseAmount
            const currencyLabel = currencyCode ? ` ${currencyCode}` : ''
            const body = `Nueva cuota de "${conceptName}" - ${periodDescription}. Monto: ${amount}${currencyLabel}. Vencimiento: ${params.quota.dueDate}.`

            await enqueueNotification({
              userId: ownership.userId,
              category: 'quota',
              title: `Nueva cuota: ${conceptName}`,
              body,
              channels: ['in_app', 'email', 'push'],
              data: {
                condominiumId: concept.condominiumId,
                conceptName,
                paymentConceptId: concept.id,
                periodDescription,
                dueDate: params.quota.dueDate,
                totalAmount: amount,
                currencyCode,
                ...(receiptId ? { receiptId } : {}),
              },
            })
          }
        }
      }
    } catch (error) {
      console.error('[QuotasController] Failed post-quota tasks', error)
    }
  }
}
