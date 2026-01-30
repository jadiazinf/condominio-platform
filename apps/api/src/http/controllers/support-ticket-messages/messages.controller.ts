import type { Context } from 'hono'
import { useTranslation } from '@intlify/hono'
import {
  supportTicketMessageCreateSchema,
  supportTicketMessageUpdateSchema,
  type TSupportTicketMessage,
  type TSupportTicketMessageCreate,
  type TSupportTicketMessageUpdate,
} from '@packages/domain'
import type { SupportTicketMessagesRepository, SupportTicketsRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { isUserAuthenticated } from '../../middlewares/utils/auth/is-user-authenticated'
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
    repository: SupportTicketMessagesRepository,
    private readonly ticketsRepository: SupportTicketsRepository
  ) {
    super(repository)
    this.createService = new CreateMessageService(repository, ticketsRepository)

    this.getMessagesByTicket = this.getMessagesByTicket.bind(this)
    this.createMessage = this.createMessage.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/support-tickets/:ticketId/messages',
        handler: this.getMessagesByTicket,
        middlewares: [isUserAuthenticated, paramsValidator(TicketIdParamSchema)],
      },
      {
        method: 'post',
        path: '/support-tickets/:ticketId/messages',
        handler: this.createMessage,
        middlewares: [isUserAuthenticated, paramsValidator(TicketIdParamSchema), bodyValidator(supportTicketMessageCreateSchema.omit({ ticketId: true, userId: true }))],
      },
      {
        method: 'delete',
        path: '/support-ticket-messages/:id',
        handler: this.delete,
        middlewares: [isUserAuthenticated, paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private async getMessagesByTicket(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TTicketIdParam>(c)
    const repo = this.repository as SupportTicketMessagesRepository

    try {
      const messages = await repo.listByTicketId(ctx.params.ticketId)

      return ctx.ok({ data: messages })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async createMessage(c: Context): Promise<Response> {
    const ctx = this.ctx<Omit<TSupportTicketMessageCreate, 'ticketId' | 'userId'>, unknown, TTicketIdParam>(c)
    const user = ctx.getAuthenticatedUser()
    const t = useTranslation(c)

    try {
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
          translatedError = t(LocaleDictionary.http.controllers.supportTickets.cannotAddMessageToClosed)
        } else if (result.error.includes('Failed to retrieve')) {
          translatedError = t(LocaleDictionary.http.controllers.supportTickets.failedToCreateMessage)
        } else {
          translatedError = t(LocaleDictionary.http.controllers.supportTickets.operationFailed)
        }

        return ctx.badRequest({ error: translatedError })
      }

      return ctx.created({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
