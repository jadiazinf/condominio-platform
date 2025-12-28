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
  constructor(repository: DocumentsRepository) {
    super(repository)
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
    const repo = this.repository as DocumentsRepository

    try {
      const documents = await repo.getPublicDocuments()
      return ctx.ok({ data: documents })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByType(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TDocumentTypeParam>(c)
    const repo = this.repository as DocumentsRepository

    try {
      const documents = await repo.getByType(ctx.params.documentType as TDocument['documentType'])
      return ctx.ok({ data: documents })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByCondominiumId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TCondominiumIdParam>(c)
    const repo = this.repository as DocumentsRepository

    try {
      const documents = await repo.getByCondominiumId(ctx.params.condominiumId)
      return ctx.ok({ data: documents })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByBuildingId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TBuildingIdParam>(c)
    const repo = this.repository as DocumentsRepository

    try {
      const documents = await repo.getByBuildingId(ctx.params.buildingId)
      return ctx.ok({ data: documents })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByUnitId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUnitIdParam>(c)
    const repo = this.repository as DocumentsRepository

    try {
      const documents = await repo.getByUnitId(ctx.params.unitId)
      return ctx.ok({ data: documents })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByUserId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)
    const repo = this.repository as DocumentsRepository

    try {
      const documents = await repo.getByUserId(ctx.params.userId)
      return ctx.ok({ data: documents })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getByPaymentId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TPaymentIdParam>(c)
    const repo = this.repository as DocumentsRepository

    try {
      const documents = await repo.getByPaymentId(ctx.params.paymentId)
      return ctx.ok({ data: documents })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
