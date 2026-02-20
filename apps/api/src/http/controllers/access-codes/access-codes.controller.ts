import type { Context } from 'hono'
import { z } from 'zod'
import { EAccessCodeValidity, ESystemRole, type TUser } from '@packages/domain'
import type { CondominiumAccessCodesRepository } from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { bodyValidator } from '../../middlewares/utils/payload-validator'
import { authMiddleware, requireRole, CONDOMINIUM_ID_PROP } from '../../middlewares/auth'
import { AUTHENTICATED_USER_PROP } from '../../middlewares/utils/auth/is-user-authenticated'
import { createRouter } from '../create-router'
import type { TRouteDefinition } from '../types'
import { GenerateAccessCodeService } from '@src/services/access-codes/generate-access-code.service'
import { GetActiveAccessCodeService } from '@src/services/access-codes/get-active-access-code.service'

const generateCodeBodySchema = z.object({
  validity: z.enum(EAccessCodeValidity),
})

export class AccessCodesController {
  private readonly generateService: GenerateAccessCodeService
  private readonly getActiveService: GetActiveAccessCodeService

  constructor(repository: CondominiumAccessCodesRepository, db: TDrizzleClient) {
    this.generateService = new GenerateAccessCodeService(db, repository)
    this.getActiveService = new GetActiveAccessCodeService(repository)
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/active',
        handler: this.getActive,
        middlewares: [authMiddleware, requireRole(ESystemRole.ADMIN)],
      },
      {
        method: 'post',
        path: '/generate',
        handler: this.generate,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN),
          bodyValidator(generateCodeBodySchema),
        ],
      },
    ]
  }

  createRouter() {
    return createRouter(this.routes)
  }

  private getActive = async (c: Context): Promise<Response> => {
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)

    if (!condominiumId) {
      return c.json({ error: 'Missing condominium ID' }, 400)
    }

    const result = await this.getActiveService.execute({ condominiumId })

    if (!result.success) {
      return c.json({ error: result.error }, 500)
    }

    return c.json({ data: result.data })
  }

  private generate = async (c: Context): Promise<Response> => {
    const condominiumId = c.get(CONDOMINIUM_ID_PROP)

    if (!condominiumId) {
      return c.json({ error: 'Missing condominium ID' }, 400)
    }

    const user: TUser = c.get(AUTHENTICATED_USER_PROP)
    const body = c.get('body') as z.infer<typeof generateCodeBodySchema>

    const result = await this.generateService.execute({
      condominiumId,
      validity: body.validity,
      createdBy: user.id,
    })

    if (!result.success) {
      return c.json({ error: result.error }, 400)
    }

    return c.json({ data: result.data }, 201)
  }
}
