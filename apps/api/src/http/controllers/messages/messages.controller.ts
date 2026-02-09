import type { Context } from 'hono'
import {
  messageCreateSchema,
  messageUpdateSchema,
  type TMessage,
  type TMessageCreate,
  type TMessageUpdate,
} from '@packages/domain'
import type { MessagesRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { z } from 'zod'
import {
  GetMessagesBySenderService,
  GetMessagesByRecipientService,
  GetUnreadMessagesByUserService,
  GetMessagesByTypeService,
  MarkMessageAsReadService,
} from '@src/services/messages'

const SenderIdParamSchema = z.object({
  senderId: z.string().uuid('Invalid sender ID format'),
})

type TSenderIdParam = z.infer<typeof SenderIdParamSchema>

const RecipientUserIdParamSchema = z.object({
  recipientUserId: z.string().uuid('Invalid recipient user ID format'),
})

type TRecipientUserIdParam = z.infer<typeof RecipientUserIdParamSchema>

const MessageTypeParamSchema = z.object({
  messageType: z.string().min(1),
})

type TMessageTypeParam = z.infer<typeof MessageTypeParamSchema>

type TIdParam = z.infer<typeof IdParamSchema>

/**
 * Controller for managing message resources.
 *
 * Messages are scoped to the current condominium via requireRole() middleware.
 * The list() endpoint returns messages for the condominium set in the Hono context.
 *
 * Endpoints:
 * - GET    /                                 List messages for current condominium
 * - GET    /sender/:senderId                 Get by sender
 * - GET    /recipient/:recipientUserId       Get by recipient user
 * - GET    /recipient/:recipientUserId/unread Get unread by recipient user
 * - GET    /type/:messageType                Get by message type
 * - GET    /:id                              Get by ID
 * - POST   /:id/read                         Mark message as read
 * - POST   /                                 Create message
 * - PATCH  /:id                              Update message
 * - DELETE /:id                              Delete message (hard delete)
 */
export class MessagesController extends BaseController<TMessage, TMessageCreate, TMessageUpdate> {
  private readonly getMessagesBySenderService: GetMessagesBySenderService
  private readonly getMessagesByRecipientService: GetMessagesByRecipientService
  private readonly getUnreadMessagesByUserService: GetUnreadMessagesByUserService
  private readonly getMessagesByTypeService: GetMessagesByTypeService
  private readonly markMessageAsReadService: MarkMessageAsReadService

  constructor(repository: MessagesRepository) {
    super(repository)

    // Initialize services
    this.getMessagesBySenderService = new GetMessagesBySenderService(repository)
    this.getMessagesByRecipientService = new GetMessagesByRecipientService(repository)
    this.getUnreadMessagesByUserService = new GetUnreadMessagesByUserService(repository)
    this.getMessagesByTypeService = new GetMessagesByTypeService(repository)
    this.markMessageAsReadService = new MarkMessageAsReadService(repository)

  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole('ADMIN', 'SUPPORT')] },
      {
        method: 'get',
        path: '/sender/:senderId',
        handler: this.getBySenderId,
        middlewares: [authMiddleware, requireRole('ADMIN', 'SUPPORT'), paramsValidator(SenderIdParamSchema)],
      },
      {
        method: 'get',
        path: '/recipient/:recipientUserId',
        handler: this.getByRecipientUserId,
        middlewares: [authMiddleware, requireRole('ADMIN', 'SUPPORT'), paramsValidator(RecipientUserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/recipient/:recipientUserId/unread',
        handler: this.getUnreadByUserId,
        middlewares: [authMiddleware, requireRole('ADMIN', 'SUPPORT', 'USER'), paramsValidator(RecipientUserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/type/:messageType',
        handler: this.getByType,
        middlewares: [authMiddleware, requireRole('ADMIN', 'SUPPORT'), paramsValidator(MessageTypeParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole('ADMIN', 'SUPPORT', 'USER'), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/:id/read',
        handler: this.markAsRead,
        middlewares: [authMiddleware, requireRole('ADMIN', 'SUPPORT'), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole('ADMIN', 'SUPPORT'), bodyValidator(messageCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [authMiddleware, requireRole('ADMIN', 'SUPPORT'), paramsValidator(IdParamSchema), bodyValidator(messageUpdateSchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, requireRole('ADMIN'), paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Override list to scope by condominium from context
  // ─────────────────────────────────────────────────────────────────────────────

  protected override list = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const repo = this.repository as MessagesRepository
    const messages = await repo.getByCondominiumId(condominiumId)
    return ctx.ok({ data: messages })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private getBySenderId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TSenderIdParam>(c)

    try {
      const result = await this.getMessagesBySenderService.execute({
        senderId: ctx.params.senderId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByRecipientUserId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TRecipientUserIdParam>(c)

    try {
      const result = await this.getMessagesByRecipientService.execute({
        recipientUserId: ctx.params.recipientUserId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getUnreadByUserId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TRecipientUserIdParam>(c)

    try {
      const result = await this.getUnreadMessagesByUserService.execute({
        recipientUserId: ctx.params.recipientUserId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private getByType = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TMessageTypeParam>(c)

    try {
      const result = await this.getMessagesByTypeService.execute({
        messageType: ctx.params.messageType as TMessage['messageType'],
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private markAsRead = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TIdParam>(c)

    try {
      const result = await this.markMessageAsReadService.execute({
        messageId: ctx.params.id,
      })

      if (!result.success) {
        return ctx.notFound({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
