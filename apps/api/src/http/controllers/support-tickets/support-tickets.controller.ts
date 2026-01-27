import type { Context } from 'hono'
import {
  supportTicketCreateSchema,
  supportTicketUpdateSchema,
  type TSupportTicket,
  type TSupportTicketCreate,
  type TSupportTicketUpdate,
} from '@packages/domain'
import type { SupportTicketsRepository } from '@database/repositories'
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
} from '../../../services/support-tickets'

const CompanyIdParamSchema = z.object({
  companyId: z.string().uuid('Invalid company ID format'),
})

type TCompanyIdParam = z.infer<typeof CompanyIdParamSchema>

const TicketsQuerySchema = z.object({
  status: z
    .enum(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'cancelled'])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().uuid().optional(),
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

  constructor(repository: SupportTicketsRepository) {
    super(repository)
    this.createService = new CreateTicketService(repository)
    this.assignService = new AssignTicketService(repository)
    this.resolveService = new ResolveTicketService(repository)
    this.closeService = new CloseTicketService(repository)
    this.updateStatusService = new UpdateTicketStatusService(repository)

    this.getAllTickets = this.getAllTickets.bind(this)
    this.getTicketsByCompany = this.getTicketsByCompany.bind(this)
    this.createTicket = this.createTicket.bind(this)
    this.assignTicket = this.assignTicket.bind(this)
    this.resolveTicket = this.resolveTicket.bind(this)
    this.closeTicket = this.closeTicket.bind(this)
    this.updateTicketStatus = this.updateTicketStatus.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/support-tickets',
        handler: this.getAllTickets,
        middlewares: [queryValidator(TicketsQuerySchema)],
      },
      {
        method: 'get',
        path: '/management-companies/:companyId/tickets',
        handler: this.getTicketsByCompany,
        middlewares: [paramsValidator(CompanyIdParamSchema), queryValidator(TicketsQuerySchema)],
      },
      {
        method: 'get',
        path: '/support-tickets/:id',
        handler: this.getById,
        middlewares: [paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/management-companies/:companyId/tickets',
        handler: this.createTicket,
        middlewares: [
          paramsValidator(CompanyIdParamSchema),
          bodyValidator(supportTicketCreateSchema),
        ],
      },
      {
        method: 'patch',
        path: '/support-tickets/:id',
        handler: this.update,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(supportTicketUpdateSchema)],
      },
      {
        method: 'patch',
        path: '/support-tickets/:id/assign',
        handler: this.assignTicket,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(AssignTicketBodySchema)],
      },
      {
        method: 'patch',
        path: '/support-tickets/:id/resolve',
        handler: this.resolveTicket,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(ResolveTicketBodySchema)],
      },
      {
        method: 'patch',
        path: '/support-tickets/:id/close',
        handler: this.closeTicket,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(CloseTicketBodySchema)],
      },
      {
        method: 'patch',
        path: '/support-tickets/:id/status',
        handler: this.updateTicketStatus,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(UpdateStatusBodySchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Override getById to include user details and messages
   */
  protected getById = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, { id: string }>(c)
    const repo = this.repository as SupportTicketsRepository

    try {
      const ticket = await repo.findByIdWithDetails(ctx.params.id)

      if (!ticket) {
        return ctx.notFound({ error: 'Ticket not found' })
      }

      return ctx.ok({ data: ticket })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getAllTickets(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TTicketsQuery, unknown>(c)
    const repo = this.repository as SupportTicketsRepository

    try {
      const result = await repo.findAll({
        status: ctx.query.status,
        priority: ctx.query.priority,
        assignedTo: ctx.query.assignedTo,
        search: ctx.query.search,
        page: ctx.query.page,
        limit: ctx.query.limit,
      })

      return ctx.ok(result)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async getTicketsByCompany(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, TTicketsQuery, TCompanyIdParam>(c)
    const repo = this.repository as SupportTicketsRepository

    try {
      const result = await repo.listByCompanyId(ctx.params.companyId, {
        status: ctx.query.status,
        priority: ctx.query.priority,
        assignedTo: ctx.query.assignedTo,
        search: ctx.query.search,
        page: ctx.query.page,
        limit: ctx.query.limit,
      })

      return ctx.ok(result)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async createTicket(c: Context): Promise<Response> {
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

  private async assignTicket(c: Context): Promise<Response> {
    const ctx = this.ctx<TAssignTicketBody, unknown, { id: string }>(c)

    try {
      const result = await this.assignService.execute({
        ticketId: ctx.params.id,
        assignedTo: ctx.body.assignedTo,
      })

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async resolveTicket(c: Context): Promise<Response> {
    const ctx = this.ctx<TResolveTicketBody, unknown, { id: string }>(c)

    try {
      const result = await this.resolveService.execute({
        ticketId: ctx.params.id,
        resolvedBy: ctx.body.resolvedBy,
      })

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async closeTicket(c: Context): Promise<Response> {
    const ctx = this.ctx<TCloseTicketBody, unknown, { id: string }>(c)

    try {
      const result = await this.closeService.execute({
        ticketId: ctx.params.id,
        closedBy: ctx.body.closedBy,
      })

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async updateTicketStatus(c: Context): Promise<Response> {
    const ctx = this.ctx<TUpdateStatusBody, unknown, { id: string }>(c)

    try {
      const result = await this.updateStatusService.execute({
        ticketId: ctx.params.id,
        status: ctx.body.status,
      })

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
