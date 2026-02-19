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
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { z } from 'zod'
import {
  GetPublicDocumentsService,
  GetDocumentsByTypeService,
  GetDocumentsByCondominiumService,
  GetDocumentsByBuildingService,
  GetDocumentsByUnitService,
  GetDocumentsByUserService,
  GetDocumentsByPaymentService,
} from '@src/services/documents'

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
  private readonly getPublicDocumentsService: GetPublicDocumentsService
  private readonly getDocumentsByTypeService: GetDocumentsByTypeService
  private readonly getDocumentsByCondominiumService: GetDocumentsByCondominiumService
  private readonly getDocumentsByBuildingService: GetDocumentsByBuildingService
  private readonly getDocumentsByUnitService: GetDocumentsByUnitService
  private readonly getDocumentsByUserService: GetDocumentsByUserService
  private readonly getDocumentsByPaymentService: GetDocumentsByPaymentService

  constructor(repository: DocumentsRepository) {
    super(repository)

    // Initialize services
    this.getPublicDocumentsService = new GetPublicDocumentsService(repository)
    this.getDocumentsByTypeService = new GetDocumentsByTypeService(repository)
    this.getDocumentsByCondominiumService = new GetDocumentsByCondominiumService(repository)
    this.getDocumentsByBuildingService = new GetDocumentsByBuildingService(repository)
    this.getDocumentsByUnitService = new GetDocumentsByUnitService(repository)
    this.getDocumentsByUserService = new GetDocumentsByUserService(repository)
    this.getDocumentsByPaymentService = new GetDocumentsByPaymentService(repository)

  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.SUPPORT, ESystemRole.USER)] },
      { method: 'get', path: '/public', handler: this.getPublicDocuments },
      {
        method: 'get',
        path: '/type/:documentType',
        handler: this.getByType,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.SUPPORT, ESystemRole.USER), paramsValidator(DocumentTypeParamSchema)],
      },
      {
        method: 'get',
        path: '/building/:buildingId',
        handler: this.getByBuildingId,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.SUPPORT, ESystemRole.USER), paramsValidator(BuildingIdParamSchema)],
      },
      {
        method: 'get',
        path: '/unit/:unitId',
        handler: this.getByUnitId,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.SUPPORT, ESystemRole.USER), paramsValidator(UnitIdParamSchema)],
      },
      {
        method: 'get',
        path: '/user/:userId',
        handler: this.getByUserId,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.SUPPORT, ESystemRole.USER), paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/payment/:paymentId',
        handler: this.getByPaymentId,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.SUPPORT, ESystemRole.USER), paramsValidator(PaymentIdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.SUPPORT, ESystemRole.USER), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN), bodyValidator(documentCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN), paramsValidator(IdParamSchema), bodyValidator(documentUpdateSchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN), paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Overridden Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  protected override list = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)

    const result = await this.getDocumentsByCondominiumService.execute({ condominiumId })

    if (!result.success) {
      return ctx.internalError({ error: result.error })
    }

    return ctx.ok({ data: result.data })
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

    try {
      const result = await this.getPublicDocumentsService.execute()

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByType = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TDocumentTypeParam>(c)

    try {
      const result = await this.getDocumentsByTypeService.execute({
        documentType: ctx.params.documentType as TDocument['documentType'],
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByBuildingId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TBuildingIdParam>(c)

    try {
      const result = await this.getDocumentsByBuildingService.execute({
        buildingId: ctx.params.buildingId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByUnitId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUnitIdParam>(c)

    try {
      const result = await this.getDocumentsByUnitService.execute({
        unitId: ctx.params.unitId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByUserId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)

    try {
      const result = await this.getDocumentsByUserService.execute({
        userId: ctx.params.userId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByPaymentId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TPaymentIdParam>(c)

    try {
      const result = await this.getDocumentsByPaymentService.execute({
        paymentId: ctx.params.paymentId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
