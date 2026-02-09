import type { Context } from 'hono'
import { auditLogCreateSchema, type TAuditLog, type TAuditLogCreate } from '@packages/domain'
import type { AuditLogsRepository } from '@database/repositories'
import { HttpContext } from '../../context'
import {
  bodyValidator,
  paramsValidator,
  queryValidator,
} from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { createRouter } from '../create-router'
import { z } from 'zod'

const TableNameParamSchema = z.object({
  tableName: z.string().min(1),
})

type TTableNameParam = z.infer<typeof TableNameParamSchema>

const RecordIdParamSchema = z.object({
  recordId: z.string().min(1),
})

type TRecordIdParam = z.infer<typeof RecordIdParamSchema>

const UserIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
})

type TUserIdParam = z.infer<typeof UserIdParamSchema>

const ActionParamSchema = z.object({
  action: z.enum(['INSERT', 'UPDATE', 'DELETE']),
})

type TActionParam = z.infer<typeof ActionParamSchema>

const TableAndRecordParamSchema = z.object({
  tableName: z.string().min(1),
  recordId: z.string().min(1),
})

type TTableAndRecordParam = z.infer<typeof TableAndRecordParamSchema>

const DateRangeQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
})

type TDateRangeQuery = z.infer<typeof DateRangeQuerySchema>

/**
 * Controller for managing audit log resources.
 * This is a read-only controller - audit logs cannot be updated or deleted.
 *
 * Endpoints:
 * - GET    /                                  List all audit logs
 * - GET    /table/:tableName                  Get by table name
 * - GET    /record/:recordId                  Get by record ID
 * - GET    /table/:tableName/record/:recordId Get by table and record
 * - GET    /user/:userId                      Get by user
 * - GET    /action/:action                    Get by action
 * - GET    /date-range                        Get by date range (query params)
 * - GET    /:id                               Get by ID
 * - POST   /                                  Create audit log
 */
export class AuditLogsController {
  constructor(protected readonly repository: AuditLogsRepository) {
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole('SUPERADMIN')] },
      {
        method: 'get',
        path: '/table/:tableName',
        handler: this.getByTableName,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(TableNameParamSchema)],
      },
      {
        method: 'get',
        path: '/record/:recordId',
        handler: this.getByRecordId,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(RecordIdParamSchema)],
      },
      {
        method: 'get',
        path: '/table/:tableName/record/:recordId',
        handler: this.getByTableAndRecord,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(TableAndRecordParamSchema)],
      },
      {
        method: 'get',
        path: '/user/:userId',
        handler: this.getByUserId,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(UserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/action/:action',
        handler: this.getByAction,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(ActionParamSchema)],
      },
      {
        method: 'get',
        path: '/date-range',
        handler: this.getByDateRange,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), queryValidator(DateRangeQuerySchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole('SUPERADMIN'), bodyValidator(auditLogCreateSchema)],
      },
    ]
  }

  createRouter() {
    return createRouter(this.routes)
  }

  protected ctx<TBody = unknown, TQuery = unknown, TParams = unknown>(c: Context) {
    return new HttpContext<TBody, TQuery, TParams>(c)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private list = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)

    try {
      const logs = await this.repository.listAll()
      return ctx.ok({ data: logs })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getById = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)

    try {
      const log = await this.repository.getById(ctx.params.id)

      if (!log) {
        return ctx.notFound({ error: 'Audit log not found' })
      }

      return ctx.ok({ data: log })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private create = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TAuditLogCreate>(c)

    try {
      const log = await this.repository.create(ctx.body)
      return ctx.created({ data: log })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByTableName = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TTableNameParam>(c)

    try {
      const logs = await this.repository.getByTableName(ctx.params.tableName)
      return ctx.ok({ data: logs })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByRecordId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TRecordIdParam>(c)

    try {
      const logs = await this.repository.getByRecordId(ctx.params.recordId)
      return ctx.ok({ data: logs })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByTableAndRecord = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TTableAndRecordParam>(c)

    try {
      const logs = await this.repository.getByTableAndRecord(
        ctx.params.tableName,
        ctx.params.recordId
      )
      return ctx.ok({ data: logs })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByUserId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TUserIdParam>(c)

    try {
      const logs = await this.repository.getByUserId(ctx.params.userId)
      return ctx.ok({ data: logs })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByAction = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TActionParam>(c)

    try {
      const logs = await this.repository.getByAction(ctx.params.action)
      return ctx.ok({ data: logs })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByDateRange = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TDateRangeQuery>(c)

    try {
      const startDate = new Date(ctx.query.startDate)
      const endDate = new Date(ctx.query.endDate)
      const logs = await this.repository.getByDateRange(startDate, endDate)
      return ctx.ok({ data: logs })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  protected handleError(ctx: HttpContext, error: unknown): Response | Promise<Response> {
    console.error('Controller error:', error)
    return ctx.internalError({ error: 'An unexpected error occurred' })
  }
}
