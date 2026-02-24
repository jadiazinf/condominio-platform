import type { Context } from 'hono'
import {
  unitOwnershipCreateSchema,
  unitOwnershipUpdateSchema,
  type TUnitOwnership,
  type TUnitOwnershipCreate,
  type TUnitOwnershipUpdate,
  ESystemRole,
  EOwnershipTypes,
} from '@packages/domain'
import type { UnitOwnershipsRepository, UsersRepository } from '@database/repositories'
import type { AddUnitOwnerService } from '@services/unit-ownerships/add-unit-owner.service'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { AUTHENTICATED_USER_PROP } from '../../middlewares/utils/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { useTranslation } from '@intlify/hono'
import { z } from 'zod'

const UnitIdParamSchema = z.object({
  unitId: z.string().uuid('Invalid unit ID format'),
})

type TUnitIdParam = z.infer<typeof UnitIdParamSchema>

const UserIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
})

type TUserIdParam = z.infer<typeof UserIdParamSchema>

const UnitAndUserParamSchema = z.object({
  unitId: z.string().uuid('Invalid unit ID format'),
  userId: z.string().uuid('Invalid user ID format'),
})

type TUnitAndUserParam = z.infer<typeof UnitAndUserParamSchema>

const AddUnitOwnerSchema = z.object({
  unitId: z.string().uuid(),
  mode: z.enum(['search', 'register']),
  ownershipType: z.enum(EOwnershipTypes),
  userId: z.string().uuid().optional(),
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  phoneCountryCode: z.string().optional(),
  idDocumentType: z.enum(['J', 'G', 'V', 'E', 'P']).nullable().optional(),
  idDocumentNumber: z.string().optional(),
})

type TAddUnitOwnerBody = z.infer<typeof AddUnitOwnerSchema>

/**
 * Controller for managing unit ownership resources.
 *
 * Endpoints:
 * - GET    /                              List all unit ownerships
 * - GET    /unit/:unitId                  Get by unit
 * - GET    /user/:userId                  Get by user
 * - GET    /user/:userId/primary          Get primary residence for user
 * - GET    /unit/:unitId/user/:userId     Get by unit and user
 * - GET    /:id                           Get by ID
 * - POST   /                              Create unit ownership
 * - PATCH  /:id                           Update unit ownership
 * - DELETE /:id                           Delete unit ownership
 * - POST   /:id/resend-invitation        Resend invitation for ownership
 */
export class UnitOwnershipsController extends BaseController<
  TUnitOwnership,
  TUnitOwnershipCreate,
  TUnitOwnershipUpdate
> {
  constructor(
    repository: UnitOwnershipsRepository,
    private readonly addUnitOwnerService?: AddUnitOwnerService,
    private readonly usersRepository?: UsersRepository
  ) {
    super(repository)
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
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(UnitIdParamSchema),
        ],
      },
      {
        method: 'get',
        path: '/user/:userId',
        handler: this.getByUserId,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.USER),
          paramsValidator(UserIdParamSchema),
        ],
      },
      {
        method: 'get',
        path: '/user/:userId/primary',
        handler: this.getPrimaryResidenceByUser,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.USER),
          paramsValidator(UserIdParamSchema),
        ],
      },
      {
        method: 'get',
        path: '/unit/:unitId/user/:userId',
        handler: this.getByUnitAndUser,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          paramsValidator(UnitAndUserParamSchema),
        ],
      },
      {
        method: 'get',
        path: '/search-user',
        handler: this.searchUser,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN)],
      },
      {
        method: 'post',
        path: '/add-owner',
        handler: this.addOwner,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN),
          bodyValidator(AddUnitOwnerSchema),
        ],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.USER),
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
          bodyValidator(unitOwnershipCreateSchema),
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
          bodyValidator(unitOwnershipUpdateSchema),
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
      {
        method: 'post',
        path: '/:id/resend-invitation',
        handler: this.resendInvitation,
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
    // TODO: Filter by condominiumId via JOIN through unit → building.condominiumId
    const entities = await this.repository.listAll()
    return ctx.ok({ data: entities })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private getByUnitId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUnitIdParam>(c)
    const repo = this.repository as UnitOwnershipsRepository

    try {
      const ownerships = await repo.getByUnitId(ctx.params.unitId)
      return ctx.ok({ data: ownerships })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByUserId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)
    const repo = this.repository as UnitOwnershipsRepository

    try {
      const ownerships = await repo.getByUserId(ctx.params.userId)
      return ctx.ok({ data: ownerships })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByUnitAndUser = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUnitAndUserParam>(c)
    const repo = this.repository as UnitOwnershipsRepository

    try {
      const ownership = await repo.getByUnitAndUser(ctx.params.unitId, ctx.params.userId)

      if (!ownership) {
        return ctx.notFound({ error: 'Unit ownership not found' })
      }

      return ctx.ok({ data: ownership })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getPrimaryResidenceByUser = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)
    const repo = this.repository as UnitOwnershipsRepository

    try {
      const ownership = await repo.getPrimaryResidenceByUser(ctx.params.userId)

      if (!ownership) {
        return ctx.notFound({ error: 'No primary residence found for user' })
      }

      return ctx.ok({ data: ownership })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private searchUser = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)

    if (!this.usersRepository) {
      return ctx.internalError({ error: 'Service not configured' })
    }

    try {
      const query = c.req.query('q')?.trim()
      if (!query) {
        return ctx.badRequest({ error: 'Query parameter "q" is required' })
      }

      const user = await this.usersRepository.getByEmailOrDocument(query)
      if (!user) {
        return ctx.ok({ data: null, found: false })
      }

      return ctx.ok({
        data: {
          id: user.id,
          displayName: user.displayName,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneCountryCode: user.phoneCountryCode,
          phoneNumber: user.phoneNumber,
          idDocumentType: user.idDocumentType,
          idDocumentNumber: user.idDocumentNumber,
          photoUrl: user.photoUrl,
          isActive: user.isActive,
        },
        found: true,
      })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private addOwner = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TAddUnitOwnerBody>(c)

    if (!this.addUnitOwnerService) {
      return ctx.internalError({ error: 'Service not configured' })
    }

    try {
      const condominiumId = c.get(CONDOMINIUM_ID_PROP)
      const user = c.get(AUTHENTICATED_USER_PROP)
      const body = ctx.body

      const result = await this.addUnitOwnerService.execute({
        unitId: body.unitId,
        condominiumId,
        mode: body.mode,
        ownershipType: body.ownershipType,
        createdBy: user.id,
        userId: body.userId,
        fullName: body.fullName,
        email: body.email || undefined,
        phone: body.phone,
        phoneCountryCode: body.phoneCountryCode,
        idDocumentType: body.idDocumentType,
        idDocumentNumber: body.idDocumentNumber,
      })

      if (!result.success) {
        const t = useTranslation(c)
        const msg = t(result.error)
        if (result.code === 'NOT_FOUND') return ctx.notFound({ error: msg })
        if (result.code === 'CONFLICT') return ctx.conflict({ error: msg })
        return ctx.badRequest({ error: msg })
      }

      return ctx.created({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private resendInvitation = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)

    if (!this.addUnitOwnerService) {
      return ctx.internalError({ error: 'Service not configured' })
    }

    try {
      const condominiumId = c.get(CONDOMINIUM_ID_PROP)
      const user = c.get(AUTHENTICATED_USER_PROP)

      const result = await this.addUnitOwnerService.resendInvitation(
        ctx.params.id,
        condominiumId,
        user.id
      )

      if (!result.success) {
        const t = useTranslation(c)
        const msg = t(result.error)
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: msg })
        }
        if (result.code === 'CONFLICT') {
          return ctx.conflict({ error: msg })
        }
        return ctx.badRequest({ error: msg })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
