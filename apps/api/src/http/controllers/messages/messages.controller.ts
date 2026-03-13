import type { Context } from 'hono'
import {
  messageCreateSchema,
  messageUpdateSchema,
  type TMessage,
  type TMessageCreate,
  type TMessageUpdate,
  ESystemRole,
} from '@packages/domain'
import type { MessagesRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { z } from 'zod'

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
  private readonly messagesRepository: MessagesRepository

  constructor(repository: MessagesRepository) {
    super(repository)
    this.messagesRepository = repository
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT)] },
      {
        method: 'get',
        path: '/sender/:senderId',
        handler: this.getBySenderId,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT), paramsValidator(SenderIdParamSchema)],
      },
      {
        method: 'get',
        path: '/recipient/:recipientUserId',
        handler: this.getByRecipientUserId,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT), paramsValidator(RecipientUserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/recipient/:recipientUserId/unread',
        handler: this.getUnreadByUserId,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT, ESystemRole.USER), paramsValidator(RecipientUserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/type/:messageType',
        handler: this.getByType,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT), paramsValidator(MessageTypeParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT, ESystemRole.USER), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/:id/read',
        handler: this.markAsRead,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT), bodyValidator(messageCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN, ESystemRole.SUPPORT), paramsValidator(IdParamSchema), bodyValidator(messageUpdateSchema)],
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
  // Override list to scope by condominium from context
  // ─────────────────────────────────────────────────────────────────────────────

  protected override list = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)
    const messages = await this.messagesRepository.getByCondominiumId(condominiumId)
    return ctx.ok({ data: messages })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private getBySenderId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TSenderIdParam>(c)
    const messages = await this.messagesRepository.getBySenderId(ctx.params.senderId)
    return ctx.ok({ data: messages })
  }

  private getByRecipientUserId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TRecipientUserIdParam>(c)
    const messages = await this.messagesRepository.getByRecipientUserId(ctx.params.recipientUserId)
    return ctx.ok({ data: messages })
  }

  private getUnreadByUserId = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TRecipientUserIdParam>(c)
    const messages = await this.messagesRepository.getUnreadByUserId(ctx.params.recipientUserId)
    return ctx.ok({ data: messages })
  }

  private getByType = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TMessageTypeParam>(c)
    const messages = await this.messagesRepository.getByType(ctx.params.messageType as TMessage['messageType'])
    return ctx.ok({ data: messages })
  }

  private markAsRead = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TIdParam>(c)
    const message = await this.messagesRepository.markAsRead(ctx.params.id)

    if (!message) {
      return ctx.notFound({ error: 'Message not found' })
    }

    return ctx.ok({ data: message })
  }
}
