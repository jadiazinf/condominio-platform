import type { MiddlewareHandler } from 'hono'
import { HttpContext } from '@http/context'
import { DatabaseService } from '@database/service'
import { UnitOwnershipsRepository } from '@database/repositories'
import { AUTHENTICATED_USER_PROP } from './is-user-authenticated'
import { USER_ROLE_PROP } from './require-role'
import { ESystemRole } from '@packages/domain'
import { LocaleDictionary } from '@locales/dictionary'
import { safeTranslation } from '@locales/safe-translation'

/**
 * Middleware that restricts unit-scoped endpoints to:
 * 1. Admins, accountants, support, and superadmins (always allowed)
 * 2. Regular users (USER role) only if they have an active ownership on the unit
 *
 * Must be used AFTER authMiddleware and requireRole in the middleware chain.
 *
 * @param unitIdParam The route parameter name containing the unit ID (default: 'unitId')
 */
export function canAccessUnit(unitIdParam = 'unitId'): MiddlewareHandler {
  return async (c, next) => {
    const ctx = new HttpContext(c)
    const t = safeTranslation(c)
    const user = c.get(AUTHENTICATED_USER_PROP)
    const userRole = c.get(USER_ROLE_PROP)

    if (!user) {
      return ctx.unauthorized({
        error: t(LocaleDictionary.http.middlewares.utils.auth.notAuthenticated),
      })
    }

    const unitId = c.req.param(unitIdParam)
    if (!unitId) {
      return ctx.badRequest({
        error: t(LocaleDictionary.http.middlewares.utils.auth.accessDenied),
      })
    }

    // Admins, accountants, support, and superadmins always have access
    const privilegedRoles: string[] = [
      ESystemRole.SUPERADMIN,
      ESystemRole.ADMIN,
      ESystemRole.ACCOUNTANT,
      ESystemRole.SUPPORT,
    ]
    if (userRole && privilegedRoles.includes(userRole)) {
      await next()
      return
    }

    // Regular users: check unit ownership
    const db = DatabaseService.getInstance().getDb()
    const ownershipsRepo = new UnitOwnershipsRepository(db)
    const ownership = await ownershipsRepo.getByUnitAndUser(unitId, user.id)

    if (ownership && ownership.isActive) {
      await next()
      return
    }

    return ctx.forbidden({
      error: t(LocaleDictionary.http.middlewares.utils.auth.accessDenied),
    })
  }
}
