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
import { z } from 'zod'
import {
  GetMessagesBySenderService,
  GetMessagesByRecipientService,
  GetUnreadMessagesByUserService,
  GetMessagesByTypeService,
  GetMessagesByCondominiumService,
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

const CondominiumIdParamSchema = z.object({
  condominiumId: z.string().uuid('Invalid condominium ID format'),
})

type TCondominiumIdParam = z.infer<typeof CondominiumIdParamSchema>

type TIdParam = z.infer<typeof IdParamSchema>

/**
 * Controller for managing message resources.
 *
 * Endpoints:
 * - GET    /                                 List all messages
 * - GET    /sender/:senderId                 Get by sender
 * - GET    /recipient/:recipientUserId       Get by recipient user
 * - GET    /recipient/:recipientUserId/unread Get unread by recipient user
 * - GET    /type/:messageType                Get by message type
 * - GET    /condominium/:condominiumId       Get by condominium
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
  private readonly getMessagesByCondominiumService: GetMessagesByCondominiumService
  private readonly markMessageAsReadService: MarkMessageAsReadService

  constructor(repository: MessagesRepository) {
    super(repository)

    // Initialize services
    this.getMessagesBySenderService = new GetMessagesBySenderService(repository)
    this.getMessagesByRecipientService = new GetMessagesByRecipientService(repository)
    this.getUnreadMessagesByUserService = new GetUnreadMessagesByUserService(repository)
    this.getMessagesByTypeService = new GetMessagesByTypeService(repository)
    this.getMessagesByCondominiumService = new GetMessagesByCondominiumService(repository)
    this.markMessageAsReadService = new MarkMessageAsReadService(repository)

    this.getBySenderId = this.getBySenderId.bind(this)
    this.getByRecipientUserId = this.getByRecipientUserId.bind(this)
    this.getUnreadByUserId = this.getUnreadByUserId.bind(this)
    this.getByType = this.getByType.bind(this)
    this.getByCondominiumId = this.getByCondominiumId.bind(this)
    this.markAsRead = this.markAsRead.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list },
      {
        method: 'get',
        path: '/sender/:senderId',
        handler: this.getBySenderId,
        middlewares: [paramsValidator(SenderIdParamSchema)],
      },
      {
        method: 'get',
        path: '/recipient/:recipientUserId',
        handler: this.getByRecipientUserId,
        middlewares: [paramsValidator(RecipientUserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/recipient/:recipientUserId/unread',
        handler: this.getUnreadByUserId,
        middlewares: [paramsValidator(RecipientUserIdParamSchema)],
      },
      {
        method: 'get',
        path: '/type/:messageType',
        handler: this.getByType,
        middlewares: [paramsValidator(MessageTypeParamSchema)],
      },
      {
        method: 'get',
        path: '/condominium/:condominiumId',
        handler: this.getByCondominiumId,
        middlewares: [paramsValidator(CondominiumIdParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/:id/read',
        handler: this.markAsRead,
        middlewares: [paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [bodyValidator(messageCreateSchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [paramsValidator(IdParamSchema), bodyValidator(messageUpdateSchema)],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [paramsValidator(IdParamSchema)],
      },
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private async getBySenderId(c: Context): Promise<Response> {
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

  private async getByRecipientUserId(c: Context): Promise<Response> {
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

  private async getUnreadByUserId(c: Context): Promise<Response> {
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

  private async getByType(c: Context): Promise<Response> {
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

  private async getByCondominiumId(c: Context): Promise<Response> {
    const ctx = this.ctx<unknown, unknown, TCondominiumIdParam>(c)

    try {
      const result = await this.getMessagesByCondominiumService.execute({
        condominiumId: ctx.params.condominiumId,
      })

      if (!result.success) {
        return ctx.internalError({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private async markAsRead(c: Context): Promise<Response> {
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
