import type { Context } from 'hono'
import { useTranslation } from '@intlify/hono'
import {
  supportTicketMessageCreateSchema,
  type TSupportTicket,
  type TSupportTicketMessage,
  type TSupportTicketMessageCreate,
  type TSupportTicketMessageUpdate,
  ALLOWED_MIME_TYPES,
  validateFileSize,
  type TAttachment,
  ESystemRole,
} from '@packages/domain'
import type {
  SupportTicketMessagesRepository,
  SupportTicketsRepository,
  ManagementCompanyMembersRepository,
  UserRolesRepository,
} from '@database/repositories'
import type { SendNotificationService } from '@packages/services'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { isUserAuthenticated } from '../../middlewares/utils/auth/is-user-authenticated'
import { canAccessTicketByTicketId } from '../../middlewares/utils/auth/can-access-ticket'
import { requireRole } from '../../middlewares/auth'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { z } from 'zod'
import { CreateMessageService } from '../../../services/support-ticket-messages'
import { LocaleDictionary } from '../../../locales/dictionary'

const TicketIdParamSchema = z.object({
  ticketId: z.string().uuid('Invalid ticket ID format'),
})

type TTicketIdParam = z.infer<typeof TicketIdParamSchema>

/**
 * Controller for managing support ticket messages.
 *
 * Endpoints:
 * - GET    /support-tickets/:ticketId/messages              Get all messages for a ticket
 * - POST   /support-tickets/:ticketId/messages              Create new message
 * - DELETE /support-ticket-messages/:id                     Delete message
 */
export class SupportTicketMessagesController extends BaseController<
  TSupportTicketMessage,
  TSupportTicketMessageCreate,
  TSupportTicketMessageUpdate
> {
  private readonly createService: CreateMessageService

  constructor(
    private readonly db: TDrizzleClient,
    repository: SupportTicketMessagesRepository,
    private readonly ticketsRepository: SupportTicketsRepository,
    private readonly membersRepository: ManagementCompanyMembersRepository,
    private readonly sendNotificationService: SendNotificationService,
    private readonly userRolesRepository: UserRolesRepository
  ) {
    super(repository)
    this.createService = new CreateMessageService(db, repository, ticketsRepository)
  }

  get routes(): TRouteDefinition[] {
    return [
      // Superadmin: Get messages for a ticket
      {
        method: 'get',
        path: '/platform/support-tickets/:ticketId/messages',
        handler: this.getMessagesByTicket,
        middlewares: [
          isUserAuthenticated,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(TicketIdParamSchema),
          canAccessTicketByTicketId,
        ],
      },
      // Superadmin: Create message
      {
        method: 'post',
        path: '/platform/support-tickets/:ticketId/messages',
        handler: this.createMessage,
        middlewares: [
          isUserAuthenticated,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(TicketIdParamSchema),
          canAccessTicketByTicketId,
          bodyValidator(supportTicketMessageCreateSchema.omit({ ticketId: true, userId: true })),
        ],
      },
      // Superadmin: Delete message
      {
        method: 'delete',
        path: '/platform/support-ticket-messages/:id',
        handler: this.delete,
        middlewares: [
          isUserAuthenticated,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(IdParamSchema),
        ],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private getMessagesByTicket = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TTicketIdParam>(c)
    const repo = this.repository as SupportTicketMessagesRepository

    try {
      const messages = await repo.listByTicketId(ctx.params.ticketId)

      return ctx.ok({ data: messages })
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

    try {
      // Validate attachments if present
      if (ctx.body.attachments && Array.isArray(ctx.body.attachments)) {
        for (const attachment of ctx.body.attachments as TAttachment[]) {
          // Validate MIME type
          if (!ALLOWED_MIME_TYPES.includes(attachment.mimeType)) {
            return ctx.badRequest({
              error: t(LocaleDictionary.http.controllers.supportTickets.invalidAttachmentType),
            })
          }

          // Validate file size
          if (!validateFileSize(attachment.mimeType, attachment.size)) {
            return ctx.badRequest({
              error: t(LocaleDictionary.http.controllers.supportTickets.attachmentTooLarge),
            })
          }
        }
      }

      const result = await this.createService.execute({
        ...ctx.body,
        ticketId: ctx.params.ticketId,
        userId: user.id,
      })

      if (!result.success) {
        // Translate error messages based on the error string
        let translatedError = result.error

        if (result.error.includes('Ticket not found')) {
          translatedError = t(LocaleDictionary.http.controllers.supportTickets.ticketNotFound)
        } else if (result.error.includes('closed or cancelled')) {
          translatedError = t(
            LocaleDictionary.http.controllers.supportTickets.cannotAddMessageToClosed
          )
        } else if (result.error.includes('Failed to retrieve')) {
          translatedError = t(
            LocaleDictionary.http.controllers.supportTickets.failedToCreateMessage
          )
        } else {
          translatedError = t(LocaleDictionary.http.controllers.supportTickets.operationFailed)
        }

        return ctx.badRequest({ error: translatedError })
      }

      // Get ticket to send notification to creator
      const ticket = await this.ticketsRepository.getById(ctx.params.ticketId)
      if (ticket) {
        this.notifyNewMessage(ticket, user.id).catch(() => {})
      }

      return ctx.created({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  // ── Notification helpers ──────────────────────────────────────────────────

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
