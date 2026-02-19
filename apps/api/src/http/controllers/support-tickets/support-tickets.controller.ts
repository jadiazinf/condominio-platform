import type { Context } from 'hono'
import { useTranslation } from '@intlify/hono'
import {
  supportTicketCreateSchema,
  supportTicketUpdateSchema,
  type TSupportTicket,
  type TSupportTicketCreate,
  type TSupportTicketUpdate,
  type TTicketStatus,
  ESystemRole,
} from '@packages/domain'
import type { SupportTicketsRepository } from '@database/repositories'
import {
  NotificationsRepository,
  NotificationDeliveriesRepository,
  UserNotificationPreferencesRepository,
  UserFcmTokensRepository,
} from '@database/repositories'
import { SendNotificationService } from '../../../services/notifications'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { BaseController } from '../base.controller'
import {
  bodyValidator,
  paramsValidator,
  queryValidator,
} from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import {
  CreateTicketService,
  AssignTicketService,
  ResolveTicketService,
  CloseTicketService,
  UpdateTicketStatusService,
  type IStatusTransitionError,
} from '../../../services/support-tickets'
import { LocaleDictionary } from '../../../locales/dictionary'
import {
  isUserAuthenticated,
  AUTHENTICATED_USER_PROP,
} from '../../middlewares/utils/auth/is-user-authenticated'
import { requireRole } from '../../middlewares/auth'
import { canAccessTicket } from '../../middlewares/utils/auth/can-access-ticket'

const CompanyIdParamSchema = z.object({
  companyId: z.string().uuid('Invalid company ID format'),
})

type TCompanyIdParam = z.infer<typeof CompanyIdParamSchema>

const TicketsQuerySchema = z.object({
  status: z
    .enum(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'cancelled'])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

type TTicketsQuery = z.infer<typeof TicketsQuerySchema>

const AssignTicketBodySchema = z.object({
  assignedTo: z.string().uuid(),
})

type TAssignTicketBody = z.infer<typeof AssignTicketBodySchema>

const ResolveTicketBodySchema = z.object({
  resolvedBy: z.string().uuid(),
})

type TResolveTicketBody = z.infer<typeof ResolveTicketBodySchema>

const CloseTicketBodySchema = z.object({
  closedBy: z.string().uuid(),
})

type TCloseTicketBody = z.infer<typeof CloseTicketBodySchema>

const UpdateStatusBodySchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'cancelled']),
})

type TUpdateStatusBody = z.infer<typeof UpdateStatusBodySchema>

/**
 * Controller for managing support tickets.
 *
 * Endpoints:
 * - GET    /support-tickets                                  Get all tickets (superadmin)
 * - GET    /management-companies/:companyId/tickets          Get all tickets by company
 * - GET    /support-tickets/:id                              Get ticket by ID
 * - POST   /management-companies/:companyId/tickets          Create new ticket
 * - PATCH  /support-tickets/:id                              Update ticket
 * - PATCH  /support-tickets/:id/assign                       Assign ticket
 * - PATCH  /support-tickets/:id/resolve                      Resolve ticket
 * - PATCH  /support-tickets/:id/close                        Close ticket
 * - PATCH  /support-tickets/:id/status                       Update ticket status
 */
export class SupportTicketsController extends BaseController<
  TSupportTicket,
  TSupportTicketCreate,
  TSupportTicketUpdate
> {
  private readonly createService: CreateTicketService
  private readonly assignService: AssignTicketService
  private readonly resolveService: ResolveTicketService
  private readonly closeService: CloseTicketService
  private readonly updateStatusService: UpdateTicketStatusService
  private readonly sendNotificationService: SendNotificationService

  constructor(
    repository: SupportTicketsRepository,
    private readonly db: TDrizzleClient
  ) {
    super(repository)
    this.createService = new CreateTicketService(repository)
    this.assignService = new AssignTicketService(repository, db)
    this.resolveService = new ResolveTicketService(repository)
    this.closeService = new CloseTicketService(repository)
    this.updateStatusService = new UpdateTicketStatusService(repository)

    // Initialize notification service
    const notificationsRepo = new NotificationsRepository(db)
    const deliveriesRepo = new NotificationDeliveriesRepository(db)
    const preferencesRepo = new UserNotificationPreferencesRepository(db)
    const fcmTokensRepo = new UserFcmTokensRepository(db)
    this.sendNotificationService = new SendNotificationService(
      notificationsRepo, deliveriesRepo, preferencesRepo, fcmTokensRepo
    )
  }

  get routes(): TRouteDefinition[] {
    return [
      // Superadmin only: Get all tickets across all companies
      {
        method: 'get',
        path: '/platform/support-tickets',
        handler: this.getAllTickets,
        middlewares: [isUserAuthenticated, requireRole(ESystemRole.SUPERADMIN), queryValidator(TicketsQuerySchema)],
      },
      // Superadmin: Get tickets by company
      {
        method: 'get',
        path: '/platform/management-companies/:companyId/tickets',
        handler: this.getTicketsByCompany,
        middlewares: [
          isUserAuthenticated,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(CompanyIdParamSchema),
          queryValidator(TicketsQuerySchema),
        ],
      },
      // Superadmin: Get ticket by ID
      {
        method: 'get',
        path: '/platform/support-tickets/:id',
        handler: this.getById,
        middlewares: [isUserAuthenticated, requireRole(ESystemRole.SUPERADMIN), paramsValidator(IdParamSchema), canAccessTicket],
      },
      // Superadmin: Create new ticket
      {
        method: 'post',
        path: '/platform/management-companies/:companyId/tickets',
        handler: this.createTicket,
        middlewares: [
          isUserAuthenticated,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(CompanyIdParamSchema),
          bodyValidator(supportTicketCreateSchema),
        ],
      },
      // Superadmin only: Update ticket
      {
        method: 'patch',
        path: '/platform/support-tickets/:id',
        handler: this.update,
        middlewares: [
          isUserAuthenticated,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(IdParamSchema),
          bodyValidator(supportTicketUpdateSchema),
        ],
      },
      // Superadmin only: Assign ticket
      {
        method: 'patch',
        path: '/platform/support-tickets/:id/assign',
        handler: this.assignTicket,
        middlewares: [
          isUserAuthenticated,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(IdParamSchema),
          bodyValidator(AssignTicketBodySchema),
        ],
      },
      // Superadmin only: Resolve ticket
      {
        method: 'patch',
        path: '/platform/support-tickets/:id/resolve',
        handler: this.resolveTicket,
        middlewares: [
          isUserAuthenticated,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(IdParamSchema),
          bodyValidator(ResolveTicketBodySchema),
        ],
      },
      // Superadmin only: Close ticket
      {
        method: 'patch',
        path: '/platform/support-tickets/:id/close',
        handler: this.closeTicket,
        middlewares: [
          isUserAuthenticated,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(IdParamSchema),
          bodyValidator(CloseTicketBodySchema),
        ],
      },
      // Superadmin only: Update ticket status
      {
        method: 'patch',
        path: '/platform/support-tickets/:id/status',
        handler: this.updateTicketStatus,
        middlewares: [
          isUserAuthenticated,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(IdParamSchema),
          bodyValidator(UpdateStatusBodySchema),
        ],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Override getById to include user details and messages
   */
  protected override getById = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const repo = this.repository as SupportTicketsRepository
    const t = useTranslation(c)

    try {
      const ticket = await repo.findByIdWithDetails(ctx.params.id)

      if (!ticket) {
        return ctx.notFound({
          error: t(LocaleDictionary.http.controllers.supportTickets.ticketNotFound),
        })
      }

      return ctx.ok({ data: ticket })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getAllTickets = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TTicketsQuery, unknown>(c)
    const repo = this.repository as SupportTicketsRepository

    try {
      const result = await repo.findAll({
        status: ctx.query.status,
        priority: ctx.query.priority,
        search: ctx.query.search,
        page: ctx.query.page,
        limit: ctx.query.limit,
      })

      return ctx.ok(result)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getTicketsByCompany = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TTicketsQuery, TCompanyIdParam>(c)
    const repo = this.repository as SupportTicketsRepository

    try {
      const result = await repo.listByCompanyId(ctx.params.companyId, {
        status: ctx.query.status,
        priority: ctx.query.priority,
        search: ctx.query.search,
        page: ctx.query.page,
        limit: ctx.query.limit,
      })

      return ctx.ok(result)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private createTicket = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TSupportTicketCreate, unknown, TCompanyIdParam>(c)

    try {
      const result = await this.createService.execute({
        ...ctx.body,
        managementCompanyId: ctx.params.companyId,
      })

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      return ctx.created({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private assignTicket = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TAssignTicketBody, unknown, { id: string }>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    try {
      const result = await this.assignService.execute({
        ticketId: ctx.params.id,
        assignedTo: ctx.body.assignedTo,
        assignedBy: user.id,
      })

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private resolveTicket = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TResolveTicketBody, unknown, { id: string }>(c)

    try {
      const result = await this.resolveService.execute({
        ticketId: ctx.params.id,
        resolvedBy: ctx.body.resolvedBy,
      })

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      // Fire-and-forget: notify ticket creator
      if (result.data.createdByUserId) {
        this.sendNotificationService.execute({
          userId: result.data.createdByUserId,
          category: 'system',
          title: 'Ticket Resolved',
          body: `Your support ticket #${result.data.ticketNumber} has been resolved.`,
          channels: ['in_app', 'push'],
          data: { ticketId: result.data.id, action: 'ticket_resolved' },
        }).catch(() => {})
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private closeTicket = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TCloseTicketBody, unknown, { id: string }>(c)

    try {
      const result = await this.closeService.execute({
        ticketId: ctx.params.id,
        closedBy: ctx.body.closedBy,
      })

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      // Fire-and-forget: notify ticket creator
      if (result.data.createdByUserId) {
        this.sendNotificationService.execute({
          userId: result.data.createdByUserId,
          category: 'system',
          title: 'Ticket Closed',
          body: `Your support ticket #${result.data.ticketNumber} has been closed.`,
          channels: ['in_app', 'push'],
          data: { ticketId: result.data.id, action: 'ticket_closed' },
        }).catch(() => {})
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private updateTicketStatus = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TUpdateStatusBody, unknown, { id: string }>(c)
    const t = useTranslation(c)

    try {
      const result = await this.updateStatusService.execute({
        ticketId: ctx.params.id,
        status: ctx.body.status,
      })

      if (!result.success) {
        // Check if it's a structured status transition error
        const error = result.error
        if (this.isStatusTransitionError(error)) {
          const translatedError = this.getStatusTransitionError(t, error.from, error.to)
          return ctx.badRequest({ error: translatedError })
        }
        // Fallback for string errors
        return ctx.badRequest({ error: String(error) })
      }

      // Fire-and-forget: notify ticket creator of status change
      if (result.data.createdByUserId) {
        this.sendNotificationService.execute({
          userId: result.data.createdByUserId,
          category: 'system',
          title: 'Ticket Status Updated',
          body: `Your support ticket #${result.data.ticketNumber} status has been updated to ${ctx.body.status.replace('_', ' ')}.`,
          channels: ['in_app', 'push'],
          data: { ticketId: result.data.id, action: 'ticket_status_updated', newStatus: ctx.body.status },
        }).catch(() => {})
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  /**
   * Type guard for status transition errors
   */
  private isStatusTransitionError(error: unknown): error is IStatusTransitionError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      (error as IStatusTransitionError).type === 'INVALID_TRANSITION'
    )
  }

  /**
   * Get translated error message for invalid status transitions
   */
  private getStatusTransitionError(
    t: (key: string) => string,
    from: TTicketStatus,
    to: TTicketStatus
  ): string {
    const dict = LocaleDictionary.http.controllers.supportTickets

    // Check for terminal states first (closed/cancelled)
    if (from === 'closed') {
      return t(dict.statusTransitions.closedNoTransition)
    }
    if (from === 'cancelled') {
      return t(dict.statusTransitions.cancelledNoTransition)
    }

    // Check specific transition errors
    const transitionKeys: Record<string, Record<string, string>> = {
      open: {
        resolved: dict.statusTransitions.openToResolved,
        closed: dict.statusTransitions.openToClosed,
      },
      in_progress: {
        open: dict.statusTransitions.inProgressToOpen,
      },
      waiting_customer: {
        open: dict.statusTransitions.waitingCustomerToOpen,
      },
      resolved: {
        open: dict.statusTransitions.resolvedToOpen,
        waiting_customer: dict.statusTransitions.resolvedToWaitingCustomer,
        cancelled: dict.statusTransitions.resolvedToCancelled,
      },
    }

    const transitionKey = transitionKeys[from]?.[to]
    if (transitionKey) {
      return t(transitionKey)
    }

    // Generic fallback
    return t(dict.invalidStatusTransition)
  }
}
