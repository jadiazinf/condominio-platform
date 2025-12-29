import type { Context } from 'hono'
import {
  documentCreateSchema,
  documentUpdateSchema,
  type TDocument,
  type TDocumentCreate,
  type TDocumentUpdate,
} from '@packages/domain'
import type { DocumentsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
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

const CondominiumIdParamSchema = z.object({
  condominiumId: z.string().uuid('Invalid condominium ID format'),
})

type TCondominiumIdParam = z.infer<typeof CondominiumIdParamSchema>

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
 * - GET    /                              List all documents
 * - GET    /public                        Get public documents
 * - GET    /type/:documentType            Get by document type
 * - GET    /condominium/:condominiumId    Get by condominium
 * - GET    /building/:buildingId          Get by building
 * - GET    /unit/:unitId                  Get by unit
 * - GET    /user/:userId                  Get by user
 * - GET    /payment/:paymentId            Get by payment
 * - GET    /:id                           Get by ID
 * - POST   /                              Create document
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

    this.getPublicDocuments = this.getPublicDocuments.bind(this)
    this.getByType = this.getByType.bind(this)
    this.getByCondominiumId = this.getByCondominiumId.bind(this)
    this.getByBuildingId = this.getByBuildingId.bind(this)
    this.getByUnitId = this.getByUnitId.bind(this)
    this.getByUserId = this.getByUserId.bind(this)
    this.getByPaymentId = this.getByPaymentId.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list },
      { method: 'get', path: '/public', handler: this.getPublicDocuments },
      {
        method: 'get',
        path: '/type/:documentType',
        handler: this.getByType,
        middlewares: [paramsValidator(DocumentTypeParamSchema)],
      },
      {
        method: 'get',
        path: '/condominium/:condominiumId',
        handler: this.getByCondominiumId,
        middlewares: [paramsValidator(CondominiumIdParamSchema)],
      },
      {
        method: 'get',
        path: '/building/:buildingId',
        handler: this.getByBuildingId,
        middlewares: [paramsValidator(BuildingIdParamSchema)],
      },
      {
        method: 'get',
        path: '/unit/:unitId',
        handler: this.getByUnitId,
        middlewares: [paramsValidator(UnitIdParamSchema)],
      },
      {
        method: 'get',
        path: '/user/:userId',
        handler: this.getByUserId,
        middlewares: [paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/payment/:paymentId',
        handler: this.getByPaymentId,
        middlewares: [paramsValidator(PaymentIdParamSchema)],
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
        middlewares: [bodyValidator(documentCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(documentUpdateSchema)],
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

  private async getPublicDocuments(c: Context): Promise<Response> {
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

  private async getByType(c: Context): Promise<Response> {
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

  private async getByCondominiumId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TCondominiumIdParam>(c)

    try {
      const result = await this.getDocumentsByCondominiumService.execute({
        condominiumId: ctx.params.condominiumId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByBuildingId(c: Context): Promise<Response> {
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

  private async getByUnitId(c: Context): Promise<Response> {
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

  private async getByUserId(c: Context): Promise<Response> {
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

  private async getByPaymentId(c: Context): Promise<Response> {
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
