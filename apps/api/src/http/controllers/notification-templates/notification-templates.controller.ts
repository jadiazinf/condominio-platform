import type { Context } from 'hono'
import {
  notificationTemplateCreateSchema,
  notificationTemplateUpdateSchema,
  type TNotificationTemplate,
  type TNotificationTemplateCreate,
  type TNotificationTemplateUpdate,
  ESystemRole,
} from '@packages/domain'
import type { NotificationTemplatesRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { z } from 'zod'
import {
  GetTemplateByCodeService,
  RenderTemplateService,
} from '@src/services/notification-templates'

const CodeParamSchema = z.object({
  code: z.string().min(1).max(100),
})

type TCodeParam = z.infer<typeof CodeParamSchema>
type TIdParam = z.infer<typeof IdParamSchema>

const RenderTemplateBodySchema = z.object({
  variables: z.record(z.string(), z.string()),
})

type TRenderTemplateBody = z.infer<typeof RenderTemplateBodySchema>

/**
 * Controller for managing notification template resources.
 *
 * Endpoints:
 * - GET    /                   List all templates
 * - GET    /code/:code         Get template by code
 * - GET    /:id                Get template by ID
 * - POST   /                   Create template
 * - POST   /code/:code/render  Render template with variables
 * - PATCH  /:id                Update template
 * - DELETE /:id                Delete template (soft delete)
 */
export class NotificationTemplatesController extends BaseController<
  TNotificationTemplate,
  TNotificationTemplateCreate,
  TNotificationTemplateUpdate
> {
  private readonly getTemplateByCodeService: GetTemplateByCodeService
  private readonly renderTemplateService: RenderTemplateService

  constructor(repository: NotificationTemplatesRepository) {
    super(repository)

    this.getTemplateByCodeService = new GetTemplateByCodeService(repository)
    this.renderTemplateService = new RenderTemplateService(repository)

  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list, middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN)] },
      {
        method: 'get',
        path: '/code/:code',
        handler: this.getByCode,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), paramsValidator(CodeParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), bodyValidator(notificationTemplateCreateSchema)],
      },
      {
        method: 'post',
        path: '/code/:code/render',
        handler: this.renderTemplate,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), paramsValidator(CodeParamSchema), bodyValidator(RenderTemplateBodySchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.SUPERADMIN),
          paramsValidator(IdParamSchema),
          bodyValidator(notificationTemplateUpdateSchema),
        ],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [authMiddleware, requireRole(ESystemRole.SUPERADMIN), paramsValidator(IdParamSchema)],
      },
    ]
  }

  private getByCode = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<unknown, unknown, TCodeParam>(c)

    try {
      const result = await this.getTemplateByCodeService.execute({
        code: ctx.params.code,
      })

      if (!result.success) {
        return ctx.notFound({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }

  private renderTemplate = async (c: Context): Promise<Response> => {
    const ctx = this.ctx<TRenderTemplateBody, unknown, TCodeParam>(c)

    try {
      const result = await this.renderTemplateService.execute({
        code: ctx.params.code,
        variables: ctx.body.variables,
      })

      if (!result.success) {
        if (result.code === 'NOT_FOUND') {
          return ctx.notFound({ error: result.error })
        }
        return ctx.badRequest({ error: result.error })
      }

      return ctx.ok({ data: result.data })
    } catch (error) {
      return this.handleError(ctx, error)
    }
  }
}
