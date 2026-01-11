import type { Context } from 'hono'
import {
  notificationTemplateCreateSchema,
  notificationTemplateUpdateSchema,
  type TNotificationTemplate,
  type TNotificationTemplateCreate,
  type TNotificationTemplateUpdate,
} from '@packages/domain'
import type { NotificationTemplatesRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import { bodyValidator, paramsValidator } from '../../middlewares/utils/payload-validator'
import { IdParamSchema } from '../common'
import type { TRouteDefinition } from '../types'
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

    this.getByCode = this.getByCode.bind(this)
    this.renderTemplate = this.renderTemplate.bind(this)
  }

  get routes(): TRouteDefinition[] {
    return [
      { method: 'get', path: '/', handler: this.list },
      {
        method: 'get',
        path: '/code/:code',
        handler: this.getByCode,
        middlewares: [paramsValidator(CodeParamSchema)],
      },
      {
        method: 'get',
        path: '/:id',
        handler: this.getById,
        middlewares: [paramsValidator(IdParamSchema)],
      },
      {
        method: 'post',
        path: '/',
        handler: this.create,
        middlewares: [bodyValidator(notificationTemplateCreateSchema)],
      },
      {
        method: 'post',
        path: '/code/:code/render',
        handler: this.renderTemplate,
        middlewares: [paramsValidator(CodeParamSchema), bodyValidator(RenderTemplateBodySchema)],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: this.update,
        middlewares: [
          paramsValidator(IdParamSchema),
          bodyValidator(notificationTemplateUpdateSchema),
        ],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: this.delete,
        middlewares: [paramsValidator(IdParamSchema)],
      },
    ]
  }

  private async getByCode(c: Context): Promise<Response> {
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

  private async renderTemplate(c: Context): Promise<Response> {
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
