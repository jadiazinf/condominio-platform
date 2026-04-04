import type { Context } from 'hono'
import { ESystemRole, type TChargeCategory } from '@packages/domain'
import type { ChargeCategoriesRepository } from '@database/repositories'
import { BaseController } from '../base.controller'
import type { TRouteDefinition } from '../types'
import { authMiddleware, requireRole } from '../../middlewares/auth'

function resolveLabel(category: TChargeCategory, lang: string): TChargeCategory & { label: string } {
  const labels = (category.labels ?? {}) as Record<string, string>
  const label = labels[lang] || labels['es'] || labels['en'] || category.name

  return { ...category, label }
}

function getLang(c: Context): string {
  const accept = c.req.header('Accept-Language') ?? 'es'
  // Parse "es-VE,es;q=0.9,en;q=0.8" → "es"
  const primary = accept.split(',')[0]?.split('-')[0]?.trim() ?? 'es'

  return primary
}

// ─── Controller ──────────────────────────────────────────────────────────

export class ChargeCategoriesController extends BaseController<
  TChargeCategory,
  any,
  any
> {
  private readonly categoriesRepo: ChargeCategoriesRepository

  constructor(repository: ChargeCategoriesRepository) {
    super(repository)
    this.categoriesRepo = repository
  }

  get routes(): TRouteDefinition[] {
    return [
      {
        method: 'get',
        path: '/',
        handler: this.listUserVisible,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN, ESystemRole.ACCOUNTANT, ESystemRole.USER),
        ],
      },
      {
        method: 'get',
        path: '/all',
        handler: this.listAll,
        middlewares: [
          authMiddleware,
          requireRole(ESystemRole.ADMIN),
        ],
      },
    ]
  }

  /** List user-visible categories with resolved label */
  private listUserVisible = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const lang = getLang(c)
    const categories = await this.categoriesRepo.listUserVisible()
    const data = categories.map(cat => resolveLabel(cat, lang))

    return ctx.ok({ data })
  }

  /** List all categories with resolved label */
  private listAll = async (c: Context): Promise<Response> => {
    const ctx = this.ctx(c)
    const lang = getLang(c)
    const categories = await this.categoriesRepo.listAllActive()
    const data = categories.map(cat => resolveLabel(cat, lang))

    return ctx.ok({ data })
  }
}
