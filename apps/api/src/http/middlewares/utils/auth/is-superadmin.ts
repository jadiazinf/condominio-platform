import type { MiddlewareHandler } from 'hono'
import { useTranslation } from '@intlify/hono'
import { and, eq, isNull } from 'drizzle-orm'
import { HttpContext } from '@http/context'
import { DatabaseService } from '@database/service'
import { userRoles, roles } from '@database/drizzle/schema'
import { AUTHENTICATED_USER_PROP } from './is-user-authenticated'
import { LocaleDictionary } from '@locales/dictionary'
import { env } from '@src/config/environment'

export const SUPERADMIN_USER_PROP = 'superadminUser'

import { ESystemRole } from '@packages/domain'

declare module 'hono' {
  interface ContextVariableMap {
    [SUPERADMIN_USER_PROP]: { id: string; userId: string; roleId: string }
  }
}

/**
 * Middleware that verifies if the authenticated user is an active superadmin.
 * Must be used after isUserAuthenticated middleware.
 *
 * A user is considered a superadmin if they have the SUPERADMIN role
 * with global scope (condominiumId = null, buildingId = null).
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

  // TODO: Uncomment when superadmin email domain restriction is ready
  // Validate that user email belongs to the authorized superadmin domain
  // if (!user.email.endsWith(env.SUPERADMIN_EMAIL_DOMAIN)) {
  //   return ctx.forbidden({
  //     error: t(LocaleDictionary.http.middlewares.utils.auth.notSuperadmin),
  //   })
  // }
  void env // Prevent unused import warning while validation is commented out

  const db = DatabaseService.getInstance().getDb()

  // Find the SUPERADMIN role
  const superadminRoleResult = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, ESystemRole.SUPERADMIN))
    .limit(1)

  if (!superadminRoleResult[0]) {
    return ctx.forbidden({
      error: t(LocaleDictionary.http.middlewares.utils.auth.notSuperadmin),
    })
  }

  const superadminRoleId = superadminRoleResult[0].id

  // Check if user has the SUPERADMIN role with global scope (no condominium/building)
  const userRoleResult = await db
    .select({
      id: userRoles.id,
      userId: userRoles.userId,
      roleId: userRoles.roleId,
      isActive: userRoles.isActive,
    })
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, user.id),
        eq(userRoles.roleId, superadminRoleId),
        isNull(userRoles.condominiumId),
        isNull(userRoles.buildingId)
      )
    )
    .limit(1)

  if (!userRoleResult[0]) {
    return ctx.forbidden({
      error: t(LocaleDictionary.http.middlewares.utils.auth.notSuperadmin),
    })
  }

  if (!userRoleResult[0].isActive) {
    return ctx.forbidden({
      error: t(LocaleDictionary.http.middlewares.utils.auth.superadminDisabled),
    })
  }

  c.set(SUPERADMIN_USER_PROP, {
    id: userRoleResult[0].id,
    userId: user.id,
    roleId: superadminRoleId,
  })

  await next()
}
