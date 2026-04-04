import type { Context } from 'hono'
import {
  documentCreateSchema,
  documentUpdateSchema,
  type TDocument,
  type TDocumentCreate,
  type TDocumentUpdate,
  ESystemRole,
} from '@packages/domain'
import type { DocumentsRepository } from '@database/repositories'
import { AppError } from '@errors/index'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { z } from 'zod'

const DocumentTypeParamSchema = z.object({
  documentType: z.string().min(1),
})

type TDocumentTypeParam = z.infer<typeof DocumentTypeParamSchema>

const BuildingIdParamSchema = z.object({
  buildingId: z.string().uuid('Invalid building ID format'),
})

type TBuildingIdParam = z.infer<typeof BuildingIdParamSchema>

const UnitIdParamSchema = z.object({
  unitId: z.string().uuid('Invalid unit ID format'),
})

type TUnitIdParam = z.infer<typeof UnitIdParamSchema>

const UserIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
})

type TUserIdParam = z.infer<typeof UserIdParamSchema>

const PaymentIdParamSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID format'),
})

type TPaymentIdParam = z.infer<typeof PaymentIdParamSchema>

const ChargeIdParamSchema = z.object({
  chargeId: z.string().uuid('Invalid charge ID format'),
})

type TChargeIdParam = z.infer<typeof ChargeIdParamSchema>

/**
 * Controller for managing document resources.
 *
 * Endpoints:
 * - GET    /                              List documents (scoped by condominium from context)
 * - GET    /public                        Get public documents
 * - GET    /type/:documentType            Get by document type
 * - GET    /building/:buildingId          Get by building
 * - GET    /unit/:unitId                  Get by unit
 * - GET    /user/:userId                  Get by user
 * - GET    /payment/:paymentId            Get by payment
 * - GET    /:id                           Get by ID
 * - POST   /                              Create document (condominiumId injected from context)
 * - PATCH  /:id                           Update document
 * - DELETE /:id                           Delete document (hard delete)
 */
export class DocumentsController extends BaseController<
  TDocument,
  TDocumentCreate,
  TDocumentUpdate
> {
  private readonly documentsRepository: DocumentsRepository

  constructor(repository: DocumentsRepository) {
    super(repository)
    this.documentsRepository = repository
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
            ESystemRole.USER
          ),
        ],
      },
      { method: 'get', path: '/public', handler: this.getPublicDocuments },
      {
        method: 'get',
        path: '/type/:documentType',
        handler: this.getByType,
        middlewares: [
          authMiddleware,
          requireRole(
            ESystemRole.ADMIN,
            ESystemRole.ACCOUNTANT,
            ESystemRole.SUPPORT,
            ESystemRole.USER
          ),
          paramsValidator(DocumentTypeParamSchema),
        ],
      },
      {
        method: 'get',
        path: '/building/:buildingId',
        handler: this.getByBuildingId,
        middlewares: [
          authMiddleware,
          requireRole(
            ESystemRole.ADMIN,
            ESystemRole.ACCOUNTANT,
            ESystemRole.SUPPORT,
            ESystemRole.USER
          ),
          paramsValidator(BuildingIdParamSchema),
        ],
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
        ],
      },
      {
        method: 'get',
        path: '/user/:userId',
        handler: this.getByUserId,
        middlewares: [
          authMiddleware,
          requireRole(
            ESystemRole.ADMIN,
            ESystemRole.ACCOUNTANT,
            ESystemRole.SUPPORT,
            ESystemRole.USER
          ),
          paramsValidator(UserIdParamSchema),
        ],
      },
      {
        method: 'get',
        path: '/payment/:paymentId',
        handler: this.getByPaymentId,
        middlewares: [
          authMiddleware,
          requireRole(
            ESystemRole.ADMIN,
            ESystemRole.ACCOUNTANT,
            ESystemRole.SUPPORT,
            ESystemRole.USER
          ),
          paramsValidator(PaymentIdParamSchema),
        ],
      },
      {
        method: 'get',
        path: '/charge/:chargeId',
        handler: this.getByChargeId,
        middlewares: [
          authMiddleware,
          requireRole(
            ESystemRole.ADMIN,
            ESystemRole.ACCOUNTANT,
            ESystemRole.SUPPORT,
            ESystemRole.USER
          ),
          paramsValidator(ChargeIdParamSchema),
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
          requireRole(ESystemRole.ADMIN),
          bodyValidator(documentCreateSchema),
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
          bodyValidator(documentUpdateSchema),
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
    const data = await this.documentsRepository.getByCondominiumId(condominiumId)
    return ctx.ok({ data })
  }

  protected override getById = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const entity = await this.repository.getById(ctx.params.id)
    if (!entity) throw AppError.notFound('Resource', ctx.params.id)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    if (condominiumId && entity.condominiumId && entity.condominiumId !== condominiumId) {
      throw AppError.notFound('Resource', ctx.params.id)
    }
    return ctx.ok({ data: entity })
  }

  protected override create = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TDocumentCreate>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const entity = await this.repository.create({ ...ctx.body, condominiumId })
    return ctx.created({ data: entity })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private getPublicDocuments = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const data = await this.documentsRepository.getPublicDocuments(condominiumId)
    return ctx.ok({ data })
  }

  private getByType = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TDocumentTypeParam>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const data = await this.documentsRepository.getByType(
      ctx.params.documentType as TDocument['documentType'],
      condominiumId
    )
    return ctx.ok({ data })
  }

  private getByBuildingId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TBuildingIdParam>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const data = await this.documentsRepository.getByBuildingId(
      ctx.params.buildingId,
      condominiumId
    )
    return ctx.ok({ data })
  }

  private getByUnitId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUnitIdParam>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const data = await this.documentsRepository.getByUnitId(ctx.params.unitId, condominiumId)
    return ctx.ok({ data })
  }

  private getByUserId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const data = await this.documentsRepository.getByUserId(ctx.params.userId, condominiumId)
    return ctx.ok({ data })
  }

  private getByPaymentId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TPaymentIdParam>(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const data = await this.documentsRepository.getByPaymentId(ctx.params.paymentId, condominiumId)
    return ctx.ok({ data })
  }

  private getByChargeId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TChargeIdParam>(c)
    const data = await this.documentsRepository.getByChargeId(ctx.params.chargeId)
    return ctx.ok({ data })
  }
}
