import type { Context } from 'hono'
import { useTranslation } from '@intlify/hono'
import {
  supportTicketMessageCreateSchema,
  type TSupportTicket,
  type TSupportTicketCreate,
  type TSupportTicketUpdate,
  type TSupportTicketMessage,
  type TSupportTicketMessageCreate,
  type TTicketChannel,
  ALLOWED_MIME_TYPES,
  validateFileSize,
  type TAttachment,
} from '@packages/domain'
import type {
  SupportTicketsRepository,
  SupportTicketMessagesRepository,
  ManagementCompanyMembersRepository,
  UserRolesRepository,
} from '@database/repositories'
import type { SendNotificationService } from '@packages/services'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { eq } from 'drizzle-orm'
import { condominiumManagementCompanies } from '@database/drizzle/schema'
import { BaseController } from '../base.controller'
import {
  bodyValidator,
  paramsValidator,
  queryValidator,
} from '../../middlewares/utils/payload-validator'
import {
  isUserAuthenticated,
  AUTHENTICATED_USER_PROP,
} from '../../middlewares/utils/auth/is-user-authenticated'
import { createCanAccessTicket, TICKET_PROP } from '../../middlewares/utils/auth/can-access-ticket'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import {
  CreateTicketService,
  UpdateTicketStatusService,
  ResolveTicketService,
  CloseTicketService,
} from '../../../services/support-tickets'
import { CreateMessageService } from '../../../services/support-ticket-messages'
import { LocaleDictionary } from '../../../locales/dictionary'
import { WebSocketManager } from '@libs/websocket'

const TicketIdParamSchema = z.object({
  ticketId: z.string().uuid('Invalid ticket ID format'),
})

type TTicketIdParam = z.infer<typeof TicketIdParamSchema>

const MyTicketsQuerySchema = z.object({
  status: z
    .enum(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'cancelled'])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  channel: z.enum(['resident_to_admin', 'resident_to_support', 'admin_to_support']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

type TMyTicketsQuery = z.infer<typeof MyTicketsQuerySchema>

const CreateUserTicketBodySchema = z.object({
  channel: z.enum(['resident_to_admin', 'resident_to_support', 'admin_to_support']),
  subject: z.string().min(1).max(255),
  description: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  category: z
    .enum([
      'technical',
      'billing',
      'feature_request',
      'general',
      'bug',
      'maintenance',
      'payment_issue',
      'access_request',
      'noise_complaint',
    ])
    .optional(),
})

type TCreateUserTicketBody = z.infer<typeof CreateUserTicketBodySchema>

const UpdateStatusBodySchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'cancelled']),
})

type TUpdateStatusBody = z.infer<typeof UpdateStatusBodySchema>

const ResolveTicketBodySchema = z.object({
  resolvedBy: z.string().uuid(),
})

type TResolveTicketBody = z.infer<typeof ResolveTicketBodySchema>

const CloseTicketBodySchema = z.object({
  closedBy: z.string().uuid(),
  solution: z.string().optional(),
})

type TCloseTicketBody = z.infer<typeof CloseTicketBodySchema>

/**
 * Controller for user/admin ticket operations (non-superadmin).
 *
 * Endpoints:
 * - POST   /tickets                     Create a new ticket
 * - GET    /tickets/my                  List my tickets (resident) or admin tickets
 * - GET    /tickets/:ticketId           Get ticket detail
 * - GET    /tickets/:ticketId/messages  Get ticket messages
 * - POST   /tickets/:ticketId/messages  Send a message
 */
export class UserTicketsController extends BaseController<
  TSupportTicket,
  TSupportTicketCreate,
  TSupportTicketUpdate
> {
  private readonly createService: CreateTicketService
  private readonly createMessageService: CreateMessageService
  private readonly updateStatusService: UpdateTicketStatusService
  private readonly resolveService: ResolveTicketService
  private readonly closeService: CloseTicketService
  private readonly wsManager = WebSocketManager.getInstance()

  constructor(
    private readonly db: TDrizzleClient,
    ticketsRepository: SupportTicketsRepository,
    private readonly messagesRepository: SupportTicketMessagesRepository,
    private readonly membersRepository: ManagementCompanyMembersRepository,
    private readonly sendNotificationService: SendNotificationService,
    private readonly userRolesRepository: UserRolesRepository
  ) {
    super(ticketsRepository)
    this.createService = new CreateTicketService(ticketsRepository)
    this.updateStatusService = new UpdateTicketStatusService(ticketsRepository)
    this.resolveService = new ResolveTicketService(ticketsRepository)
    this.closeService = new CloseTicketService(ticketsRepository)
    this.createMessageService = new CreateMessageService(db, messagesRepository, ticketsRepository)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'post',
        path: '/tickets',
        handler: this.createTicket,
        middlewares: [isUserAuthenticated, bodyValidator(CreateUserTicketBodySchema)],
      },
      {
        method: 'get',
        path: '/tickets/my',
        handler: this.getMyTickets,
        middlewares: [isUserAuthenticated, queryValidator(MyTicketsQuerySchema)],
      },
      {
        method: 'get',
        path: '/tickets/:ticketId',
        handler: this.getTicketDetail,
        middlewares: [
          isUserAuthenticated,
          paramsValidator(TicketIdParamSchema),
          createCanAccessTicket('ticketId'),
        ],
      },
      {
        method: 'get',
        path: '/tickets/:ticketId/messages',
        handler: this.getTicketMessages,
        middlewares: [
          isUserAuthenticated,
          paramsValidator(TicketIdParamSchema),
          createCanAccessTicket('ticketId'),
        ],
      },
      {
        method: 'post',
        path: '/tickets/:ticketId/messages',
        handler: this.createMessage,
        middlewares: [
          isUserAuthenticated,
          paramsValidator(TicketIdParamSchema),
          createCanAccessTicket('ticketId'),
          bodyValidator(supportTicketMessageCreateSchema.omit({ ticketId: true, userId: true })),
        ],
      },
      {
        method: 'patch',
        path: '/tickets/:ticketId/status',
        handler: this.updateTicketStatus,
        middlewares: [
          isUserAuthenticated,
          paramsValidator(TicketIdParamSchema),
          createCanAccessTicket('ticketId'),
          bodyValidator(UpdateStatusBodySchema),
        ],
      },
      {
        method: 'patch',
        path: '/tickets/:ticketId/resolve',
        handler: this.resolveTicket,
        middlewares: [
          isUserAuthenticated,
          paramsValidator(TicketIdParamSchema),
          createCanAccessTicket('ticketId'),
          bodyValidator(ResolveTicketBodySchema),
        ],
      },
      {
        method: 'patch',
        path: '/tickets/:ticketId/close',
        handler: this.closeTicket,
        middlewares: [
          isUserAuthenticated,
          paramsValidator(TicketIdParamSchema),
          createCanAccessTicket('ticketId'),
          bodyValidator(CloseTicketBodySchema),
        ],
      },
    ]
  }

  /**
   * Derive managementCompanyId from condominiumId via junction table
   */
  private async getManagementCompanyIdFromCondominium(
    condominiumId: string
  ): Promise<string | null> {
    const result = await this.db
      .select({ managementCompanyId: condominiumManagementCompanies.managementCompanyId })
      .from(condominiumManagementCompanies)
      .where(eq(condominiumManagementCompanies.condominiumId, condominiumId))
      .limit(1)

    return result[0]?.managementCompanyId ?? null
  }

  private createTicket = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TCreateUserTicketBody>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)
    const t = useTranslation(c)
    const body = ctx.body

    try {
      let managementCompanyId: string | null = null
      let condominiumId: string | null = null

      if (body.channel === 'admin_to_support') {
        // Admin creating ticket to support — get their management company
        const memberships = await this.membersRepository.listByUserIdWithCompany(user.id)
        if (memberships.length === 0) {
          return ctx.forbidden({
            error: t(LocaleDictionary.http.middlewares.utils.auth.noTicketAccess),
          })
        }
        managementCompanyId = memberships[0]!.managementCompanyId
      } else {
        // Resident creating ticket — use x-condominium-id header
        condominiumId = c.req.header('x-condominium-id') ?? null
        if (!condominiumId) {
          return ctx.badRequest({
            error: 'x-condominium-id header is required for resident tickets',
          })
        }

        managementCompanyId = await this.getManagementCompanyIdFromCondominium(condominiumId)
        if (!managementCompanyId) {
          return ctx.badRequest({
            error: 'Condominium is not associated with a management company',
          })
        }
      }

      const result = await this.createService.execute({
        managementCompanyId,
        channel: body.channel as TTicketChannel,
        condominiumId,
        createdByUserId: user.id,
        createdByMemberId: null,
        subject: body.subject,
        description: body.description,
        priority: body.priority,
        status: 'open',
        category: body.category ?? null,
        resolvedAt: null,
        resolvedBy: null,
        solution: null,
        closedAt: null,
        closedBy: null,
        metadata: null,
        tags: null,
      })

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      // Fire-and-forget notifications based on channel
      this.notifyTicketCreated(result.data).catch(() => {})

      return ctx.created({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getMyTickets = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, TMyTicketsQuery>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)
    const repo = this.repository as SupportTicketsRepository

    try {
      // Check if user is an admin (member of a management company)
      const memberships = await this.membersRepository.listByUserIdWithCompany(user.id)
      const isAdmin = memberships.length > 0

      let result

      if (isAdmin) {
        // Admin: see resident→admin for their company + their own admin→support tickets
        result = await repo.listForAdmin(user.id, memberships[0]!.managementCompanyId, {
          status: ctx.query.status,
          priority: ctx.query.priority,
          channel: ctx.query.channel,
          search: ctx.query.search,
          page: ctx.query.page,
          limit: ctx.query.limit,
        })
      } else {
        // Regular user (resident): see only their own tickets
        result = await repo.listByCreatorUserId(user.id, {
          status: ctx.query.status,
          priority: ctx.query.priority,
          channel: ctx.query.channel,
          search: ctx.query.search,
          page: ctx.query.page,
          limit: ctx.query.limit,
        })
      }

      return ctx.ok(result)
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getTicketDetail = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TTicketIdParam>(c)
    const repo = this.repository as SupportTicketsRepository

    try {
      const ticket = await repo.findByIdWithDetails(ctx.params.ticketId)

      if (!ticket) {
        const t = useTranslation(c)
        return ctx.notFound({
          error: t(LocaleDictionary.http.controllers.supportTickets.ticketNotFound),
        })
      }

      return ctx.ok({ data: ticket })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getTicketMessages = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TTicketIdParam>(c)
    try {
      const messages = await this.messagesRepository.listByTicketId(ctx.params.ticketId)

      // Internal messages are only visible to superadmins (handled by the platform endpoint).
      // All users/admins through this endpoint should never see internal messages.
      const filteredMessages = messages.filter((m: TSupportTicketMessage) => !m.isInternal)

      return ctx.ok({ data: filteredMessages })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private createMessage = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<
      Omit<TSupportTicketMessageCreate, 'ticketId' | 'userId'>,
      unknown,
      TTicketIdParam
    >(c)
    const user = ctx.getAuthenticatedUser()
    const t = useTranslation(c)
    const ticket = c.get(TICKET_PROP) as TSupportTicket

    try {
      // Residents cannot send internal messages
      const memberships = await this.membersRepository.listByUserIdWithCompany(user.id)
      const isAdminOfCompany = memberships.some(
        m => m.managementCompanyId === ticket.managementCompanyId
      )

      if (ctx.body.isInternal && !isAdminOfCompany) {
        return ctx.forbidden({
          error: 'Only administrators can send internal messages',
        })
      }

      // Validate attachments if present
      if (ctx.body.attachments && Array.isArray(ctx.body.attachments)) {
        for (const attachment of ctx.body.attachments as TAttachment[]) {
          if (!ALLOWED_MIME_TYPES.includes(attachment.mimeType)) {
            return ctx.badRequest({
              error: t(LocaleDictionary.http.controllers.supportTickets.invalidAttachmentType),
            })
          }
          if (!validateFileSize(attachment.mimeType, attachment.size)) {
            return ctx.badRequest({
              error: t(LocaleDictionary.http.controllers.supportTickets.attachmentTooLarge),
            })
          }
        }
      }

      const result = await this.createMessageService.execute({
        ...ctx.body,
        ticketId: ctx.params.ticketId,
        userId: user.id,
      })

      if (!result.success) {
        let translatedError = result.error
        if (result.error.includes('Ticket not found')) {
          translatedError = t(LocaleDictionary.http.controllers.supportTickets.ticketNotFound)
        } else if (result.error.includes('closed or cancelled')) {
          translatedError = t(
            LocaleDictionary.http.controllers.supportTickets.cannotAddMessageToClosed
          )
        }
        return ctx.badRequest({ error: translatedError })
      }

      // Fire-and-forget: notify the other party about the new message
      this.notifyNewMessage(ticket, user.id).catch(() => {})

      return ctx.created({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  // ── Admin ticket management ─────────────────────────────────────────────

  /**
   * Check if the authenticated user is an admin of the ticket's management company.
   */
  private async isAdminOfTicket(userId: string, ticket: TSupportTicket): Promise<boolean> {
    if (ticket.channel !== 'resident_to_admin') return false
    const memberships = await this.membersRepository.listByUserIdWithCompany(userId)
    return memberships.some(m => m.managementCompanyId === ticket.managementCompanyId)
  }

  private updateTicketStatus = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TUpdateStatusBody, unknown, TTicketIdParam>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)
    const ticket = c.get(TICKET_PROP) as TSupportTicket
    const t = useTranslation(c)

    try {
      const canManage = await this.isAdminOfTicket(user.id, ticket)
      if (!canManage) {
        return ctx.forbidden({
          error: t(LocaleDictionary.http.middlewares.utils.auth.noTicketAccess),
        })
      }

      const result = await this.updateStatusService.execute({
        ticketId: ctx.params.ticketId,
        status: ctx.body.status,
      })

      if (!result.success) {
        const errorMsg =
          typeof result.error === 'string'
            ? result.error
            : `Invalid transition from ${result.error.from} to ${result.error.to}`
        return ctx.badRequest({ error: errorMsg })
      }

      this.wsManager.broadcastToTicket(ctx.params.ticketId, 'ticket_updated', result.data)

      // Notify ticket creator about status change
      if (result.data.createdByUserId) {
        this.sendNotificationService
          .execute({
            userId: result.data.createdByUserId,
            category: 'system',
            title: 'Estado de ticket actualizado',
            body: `Ticket #${result.data.ticketNumber}: ${result.data.subject}`,
            channels: ['in_app', 'push'],
            data: { ticketId: result.data.id, action: 'ticket_status_updated' },
          })
          .catch(() => {})
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private resolveTicket = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TResolveTicketBody, unknown, TTicketIdParam>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)
    const ticket = c.get(TICKET_PROP) as TSupportTicket

    try {
      const canManage = await this.isAdminOfTicket(user.id, ticket)
      if (!canManage) {
        const t = useTranslation(c)
        return ctx.forbidden({
          error: t(LocaleDictionary.http.middlewares.utils.auth.noTicketAccess),
        })
      }

      const result = await this.resolveService.execute({
        ticketId: ctx.params.ticketId,
        resolvedBy: ctx.body.resolvedBy,
      })

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      this.wsManager.broadcastToTicket(ctx.params.ticketId, 'ticket_updated', result.data)

      if (result.data.createdByUserId) {
        this.sendNotificationService
          .execute({
            userId: result.data.createdByUserId,
            category: 'system',
            title: 'Tu ticket ha sido resuelto',
            body: `Ticket #${result.data.ticketNumber}: ${result.data.subject}`,
            channels: ['in_app', 'push'],
            data: { ticketId: result.data.id, action: 'ticket_resolved' },
          })
          .catch(() => {})
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private closeTicket = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TCloseTicketBody, unknown, TTicketIdParam>(c)
    const user = c.get(AUTHENTICATED_USER_PROP)
    const ticket = c.get(TICKET_PROP) as TSupportTicket

    try {
      const canManage = await this.isAdminOfTicket(user.id, ticket)
      if (!canManage) {
        const t = useTranslation(c)
        return ctx.forbidden({
          error: t(LocaleDictionary.http.middlewares.utils.auth.noTicketAccess),
        })
      }

      const result = await this.closeService.execute({
        ticketId: ctx.params.ticketId,
        closedBy: ctx.body.closedBy,
      })

      if (!result.success) {
        return ctx.badRequest({ error: result.error })
      }

      this.wsManager.broadcastToTicket(ctx.params.ticketId, 'ticket_updated', result.data)

      if (result.data.createdByUserId) {
        this.sendNotificationService
          .execute({
            userId: result.data.createdByUserId,
            category: 'system',
            title: 'Tu ticket ha sido cerrado',
            body: `Ticket #${result.data.ticketNumber}: ${result.data.subject}`,
            channels: ['in_app', 'push'],
            data: { ticketId: result.data.id, action: 'ticket_closed' },
          })
          .catch(() => {})
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  // ── Notification helpers ──────────────────────────────────────────────────

  /**
   * Notifies relevant parties when a new ticket is created.
   * - resident_to_admin: notify admins of the management company
   * - resident_to_support / admin_to_support: notify superadmins
   */
  private async notifyTicketCreated(ticket: TSupportTicket): Promise<void> {
    const notificationData = { ticketId: ticket.id, action: 'ticket_created' }

    if (ticket.channel === 'resident_to_admin') {
      // Notify all active members of the management company
      const members = await this.membersRepository.listByCompanyId(ticket.managementCompanyId)
      for (const member of members) {
        if (member.userId === ticket.createdByUserId) continue
        await this.sendNotificationService.execute({
          userId: member.userId,
          category: 'system',
          title: 'Nuevo ticket de residente',
          body: `Ticket #${ticket.ticketNumber}: ${ticket.subject}`,
          channels: ['in_app', 'push'],
          data: notificationData,
        })
      }
    } else {
      // resident_to_support or admin_to_support: notify superadmins
      const superadmins = await this.userRolesRepository.getActiveSuperadminUsers()
      for (const superadmin of superadmins) {
        await this.sendNotificationService.execute({
          userId: superadmin.id,
          category: 'system',
          title: 'Nuevo ticket de soporte',
          body: `Ticket #${ticket.ticketNumber}: ${ticket.subject}`,
          channels: ['in_app', 'push'],
          data: notificationData,
        })
      }
    }
  }

  /**
   * Notifies the other party when a new message is sent on a ticket.
   * - If the sender is the ticket creator → notify admins/superadmins
   * - If the sender is an admin/superadmin → notify the ticket creator
   */
  private async notifyNewMessage(ticket: TSupportTicket, senderId: string): Promise<void> {
    const notificationData = { ticketId: ticket.id, action: 'new_ticket_message' }
    const notificationBody = `Ticket #${ticket.ticketNumber}: ${ticket.subject}`

    if (senderId === ticket.createdByUserId) {
      // Creator sent a message → notify responders
      if (ticket.channel === 'resident_to_admin') {
        const members = await this.membersRepository.listByCompanyId(ticket.managementCompanyId)
        for (const member of members) {
          await this.sendNotificationService.execute({
            userId: member.userId,
            category: 'system',
            title: 'Nuevo mensaje en ticket',
            body: notificationBody,
            channels: ['in_app', 'push'],
            data: notificationData,
          })
        }
      } else {
        const superadmins = await this.userRolesRepository.getActiveSuperadminUsers()
        for (const superadmin of superadmins) {
          await this.sendNotificationService.execute({
            userId: superadmin.id,
            category: 'system',
            title: 'Nuevo mensaje en ticket',
            body: notificationBody,
            channels: ['in_app', 'push'],
            data: notificationData,
          })
        }
      }
    } else {
      // Admin/superadmin sent a message → notify the ticket creator
      if (ticket.createdByUserId) {
        await this.sendNotificationService.execute({
          userId: ticket.createdByUserId,
          category: 'system',
          title: 'Respuesta en tu ticket',
          body: notificationBody,
          channels: ['in_app', 'push'],
          data: notificationData,
        })
      }
    }
  }
}
