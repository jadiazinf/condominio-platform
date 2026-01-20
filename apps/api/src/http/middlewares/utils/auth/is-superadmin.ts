import type { MiddlewareHandler } from 'hono'
import { useTranslation } from '@intlify/hono'
import { HttpContext } from '@http/context'
import { DatabaseService } from '@database/service'
import { SuperadminUsersRepository } from '@database/repositories'
import { AUTHENTICATED_USER_PROP } from './is-user-authenticated'
import { LocaleDictionary } from '@locales/dictionary'

export const SUPERADMIN_USER_PROP = 'superadminUser'

declare module 'hono' {
  interface ContextVariableMap {
    [SUPERADMIN_USER_PROP]: { id: string; userId: string }
  }
}

/**
 * Middleware that verifies if the authenticated user is an active superadmin.
 * Must be used after isUserAuthenticated middleware.
 *
 * Sets the superadmin user info in context variable 'superadminUser'.
 */
export const isSuperadmin: MiddlewareHandler = async (c, next) => {
  const ctx = new HttpContext(c)
  const t = useTranslation(c)
  const user = c.get(AUTHENTICATED_USER_PROP)

  if (!user) {
    return ctx.unauthorized({
      error: t(LocaleDictionary.http.middlewares.utils.auth.notAuthenticated),
    })
  }

  const db = DatabaseService.getInstance().getDb()
  const superadminUsersRepository = new SuperadminUsersRepository(db)

  const superadminUser = await superadminUsersRepository.getByUserId(user.id)

  if (!superadminUser) {
    return ctx.forbidden({
      error: t(LocaleDictionary.http.middlewares.utils.auth.notSuperadmin),
    })
  }

  if (!superadminUser.isActive) {
    return ctx.forbidden({
      error: t(LocaleDictionary.http.middlewares.utils.auth.superadminDisabled),
    })
  }

  // Update last access timestamp
  await superadminUsersRepository.updateLastAccess(superadminUser.id)

  c.set(SUPERADMIN_USER_PROP, {
    id: superadminUser.id,
    userId: superadminUser.userId,
  })

  await next()
}
