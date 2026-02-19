import type { Context } from 'hono'
import {
  amenityReservationCreateSchema,
  amenityReservationUpdateSchema,
  type TAmenityReservation,
  type TAmenityReservationCreate,
  type TAmenityReservationUpdate,
  ESystemRole,
} from '@packages/domain'
import type { AmenityReservationsRepository, AmenitiesRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator, queryValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import {
  CreateReservationService,
  CancelReservationService,
  ApproveReservationService,
  RejectReservationService,
  CheckAvailabilityService,
} from '@src/services/amenity-reservations'

const AmenityIdParamSchema = z.object({
  amenityId: z.string().uuid('Invalid amenity ID format'),
})

type TAmenityIdParam = z.infer<typeof AmenityIdParamSchema>

const UserIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
})

type TUserIdParam = z.infer<typeof UserIdParamSchema>

const ApproveBodySchema = z.object({
  approvedBy: z.string().uuid('Invalid user ID format'),
})

type TApproveBody = z.infer<typeof ApproveBodySchema>

const RejectBodySchema = z.object({
  rejectionReason: z.string().optional(),
})

type TRejectBody = z.infer<typeof RejectBodySchema>

const CheckAvailabilityQuerySchema = z.object({
  amenityId: z.string().uuid('Invalid amenity ID format'),
  startTime: z.string(),
  endTime: z.string(),
})

type TCheckAvailabilityQuery = z.infer<typeof CheckAvailabilityQuerySchema>

/**
 * Controller for managing amenity reservation resources.
 *
 * Endpoints:
 * - GET    /                              List all reservations
 * - GET    /amenity/:amenityId            Get by amenity
 * - GET    /user/:userId                  Get by user
 * - GET    /check-availability            Check availability
 * - GET    /:id                           Get by ID
 * - POST   /                              Create reservation
 * - PATCH  /:id                           Update reservation
 * - PATCH  /:id/approve                   Approve reservation
 * - PATCH  /:id/reject                    Reject reservation
 * - PATCH  /:id/cancel                    Cancel reservation
 * - DELETE /:id                           Delete reservation (hard)
 */
export class AmenityReservationsController extends BaseController<
  TAmenityReservation,
  TAmenityReservationCreate,
  TAmenityReservationUpdate
> {
  private readonly createReservationService: CreateReservationService
  private readonly cancelReservationService: CancelReservationService
  private readonly approveReservationService: ApproveReservationService
  private readonly rejectReservationService: RejectReservationService
  private readonly checkAvailabilityService: CheckAvailabilityService

  constructor(
    repository: AmenityReservationsRepository,
    amenitiesRepository: AmenitiesRepository
  ) {
    super(repository)

    this.createReservationService = new CreateReservationService(repository, amenitiesRepository)
    this.cancelReservationService = new CancelReservationService(repository)
    this.approveReservationService = new ApproveReservationService(repository)
    this.rejectReservationService = new RejectReservationService(repository)
    this.checkAvailabilityService = new CheckAvailabilityService(
      repository,
      amenitiesRepository
    )
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT)] },
      {
        method: 'get',
        path: '/amenity/:amenityId',
        handler: this.getByAmenityId,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT), paramsValidator(AmenityIdParamSchema)],
      },
      {
        method: 'get',
        path: '/user/:userId',
        handler: this.getByUserId,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT, ESystemRole.USER), paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/check-availability',
        handler: this.checkAvailability,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT, ESystemRole.USER), queryValidator(CheckAvailabilityQuerySchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT, ESystemRole.USER), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.createReservation,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT, ESystemRole.USER), bodyValidator(amenityReservationCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT),
          paramsValidator(IdParamSchema),
          bodyValidator(amenityReservationUpdateSchema),
        ],
      },
      {
        method: 'patch',
        path: '/:id/approve',
        handler: this.approveReservation,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT),
          paramsValidator(IdParamSchema),
          bodyValidator(ApproveBodySchema),
        ],
      },
      {
        method: 'patch',
        path: '/:id/reject',
        handler: this.rejectReservation,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT),
          paramsValidator(IdParamSchema),
          bodyValidator(RejectBodySchema),
        ],
      },
      {
        method: 'patch',
        path: '/:id/cancel',
        handler: this.cancelReservation,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT, ESystemRole.USER), paramsValidator(IdParamSchema)],
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
    // TODO: Filter by condominiumId via JOIN through amenity.condominiumId
    const entities = await this.repository.listAll()
    return ctx.ok({ data: entities })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private getByAmenityId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TAmenityIdParam>(c)
    const repo = this.repository as unknown as AmenityReservationsRepository

    try {
      const reservations = await repo.getByAmenityId(ctx.params.amenityId)
      return ctx.ok({ data: reservations })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByUserId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)
    const repo = this.repository as unknown as AmenityReservationsRepository

    try {
      const reservations = await repo.getByUserId(ctx.params.userId)
      return ctx.ok({ data: reservations })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private createReservation = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TAmenityReservationCreate>(c)

    try {
      const result = await this.createReservationService.execute({
        data: ctx.body,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        if (result.code === 'CONFLICT') {
          return ctx.conflict({ error: result.error })
        }
        return ctx.badRequest({ error: result.error })
      }

      return ctx.created({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private approveReservation = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TApproveBody, unknown, { id: string }>(c)

    try {
      const result = await this.approveReservationService.execute({
        reservationId: ctx.params.id,
        approvedBy: ctx.body.approvedBy,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private rejectReservation = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TRejectBody, unknown, { id: string }>(c)

    try {
      const result = await this.rejectReservationService.execute({
        reservationId: ctx.params.id,
        rejectionReason: ctx.body.rejectionReason,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private cancelReservation = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)

    try {
      const result = await this.cancelReservationService.execute({
        reservationId: ctx.params.id,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private checkAvailability = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TCheckAvailabilityQuery>(c)

    try {
      const result = await this.checkAvailabilityService.execute({
        amenityId: ctx.query.amenityId,
        startTime: new Date(ctx.query.startTime),
        endTime: new Date(ctx.query.endTime),
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
