import type { Context } from 'hono'
import { z } from 'zod'
import {
  EEventLogCategories,
  EEventLogLevels,
  EEventLogResults,
  EEventLogSources,
  ESystemRole,
} from '@packages/domain'
import type { EventLogsRepository } from '@database/repositories'
import { HttpContext } from '../../context'
import { queryValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import type { TRouteDefinition } from '../types'
import { createRouter } from '../create-router'

const EventLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  category: z.enum(EEventLogCategories).optional(),
  level: z.enum(EEventLogLevels).optional(),
  result: z.enum(EEventLogResults).optional(),
  source: z.enum(EEventLogSources).optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  event: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

export class EventLogsController {
  constructor(private readonly eventLogsRepo: EventLogsRepository) {}

  get routes(): TRouteDefinition[] {
    return [
      // Superadmin: list all event logs
      {
        method: 'get',
        path: '/',
        handler: this.listAll,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.SUPERADMIN),
          queryValidator(EventLogsQuerySchema),
        ],
      },
      // Superadmin: get event log by ID
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN)],
      },
    ]
  }

  createRouter() {
    return createRouter(this.routes)
  }

  private listAll = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext(c)
    const query = ctx.query as z.infer<typeof EventLogsQuerySchema>

    try {
      const result = await this.eventLogsRepo.listPaginated({
        page: query.page,
        limit: query.limit,
        category: query.category,
        level: query.level,
        result: query.result,
        source: query.source,
        entityType: query.entityType,
        entityId: query.entityId,
        event: query.event,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      })

      return ctx.ok(result)
    } catch (error) {
      return ctx.internalError({
        error: error instanceof Error ? error.message : 'Error fetching event logs',
      })
    }
  }

  private getById = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext<unknown, unknown, { id: string }>(c)
    const { id } = ctx.params

    try {
      const log = await this.eventLogsRepo.getById(id)
      if (!log) {
        return ctx.notFound({ error: 'Event log not found' })
      }
      return ctx.ok({ data: log })
    } catch (error) {
      return ctx.internalError({
        error: error instanceof Error ? error.message : 'Error fetching event log',
      })
    }
  }
}

// Condominium-scoped controller for admin users
const CondominiumEventLogsQuerySchema = EventLogsQuerySchema

export class CondominiumEventLogsController {
  constructor(private readonly eventLogsRepo: EventLogsRepository) {}

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.listByCondominium,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT),
          queryValidator(CondominiumEventLogsQuerySchema),
        ],
      },
    ]
  }

  createRouter() {
    return createRouter(this.routes)
  }

  private listByCondominium = async (c: Context): Promise<Response> => {
    const ctx = new HttpContext(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const query = ctx.query as z.infer<typeof CondominiumEventLogsQuerySchema>

    if (!condominiumId) {
      return ctx.badRequest({ error: 'Condominium ID is required' })
    }

    try {
      const result = await this.eventLogsRepo.listByCondominiumId(condominiumId, {
        page: query.page,
        limit: query.limit,
        category: query.category,
        level: query.level,
        result: query.result,
        source: query.source,
        entityType: query.entityType,
        entityId: query.entityId,
        event: query.event,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      })

      return ctx.ok(result)
    } catch (error) {
      return ctx.internalError({
        error: error instanceof Error ? error.message : 'Error fetching event logs',
      })
    }
  }
}
