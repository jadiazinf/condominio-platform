import type { Context } from 'hono'
import { Hono } from 'hono'
import type { TWizardType } from '@packages/domain'
import type { WizardDraftsRepository } from '@database/repositories'
import { authMiddleware } from '../../middlewares/auth'
import { AUTHENTICATED_USER_PROP } from '../../middlewares/utils/auth/is-user-authenticated'

export class WizardDraftsController {
  constructor(private readonly repository: WizardDraftsRepository) {}

  createRouter(): Hono {
    const router = new Hono()

    router.get('/:wizardType/:entityId', authMiddleware, this.get)
    router.put('/:wizardType/:entityId', authMiddleware, this.upsert)
    router.delete('/:wizardType/:entityId', authMiddleware, this.delete)

    return router
  }

  private get = async (c: Context): Promise<Response> => {
    const wizardType = c.req.param('wizardType') as TWizardType
    const entityId = c.req.param('entityId')

    const draft = await this.repository.getByWizardAndEntity(wizardType, entityId)

    if (!draft) {
      return c.json({ error: 'Draft not found' }, 404)
    }

    return c.json({ data: draft })
  }

  private upsert = async (c: Context): Promise<Response> => {
    const wizardType = c.req.param('wizardType') as TWizardType
    const entityId = c.req.param('entityId')
    const user = c.get(AUTHENTICATED_USER_PROP)
    const body = await c.req.json<{ data: Record<string, unknown>; currentStep: number }>()

    const draft = await this.repository.upsert({
      wizardType,
      entityId,
      data: body.data,
      currentStep: body.currentStep,
      lastModifiedBy: user?.id ?? null,
    })

    return c.json({ data: draft })
  }

  private delete = async (c: Context): Promise<Response> => {
    const wizardType = c.req.param('wizardType') as TWizardType
    const entityId = c.req.param('entityId')

    await this.repository.deleteByWizardAndEntity(wizardType, entityId)

    return c.body(null, 204)
  }
}
