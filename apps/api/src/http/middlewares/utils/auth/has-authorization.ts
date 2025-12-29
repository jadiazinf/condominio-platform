import type { MiddlewareHandler } from 'hono'
import { useTranslation } from '@intlify/hono'
import { HttpContext } from '@http/context'
import { DatabaseService } from '@database/service'
import { userRoles, roles, rolePermissions, permissions } from '@database/drizzle/schema'
import { eq, and, isNull, or, gt } from 'drizzle-orm'
import { AUTHENTICATED_USER_PROP } from './is-user-authenticated'
import { LocaleDictionary } from '@locales/dictionary'
import type { TPermissionModule, TPermissionAction } from '@packages/domain'

export interface IAuthorizationOptions {
  roles?: string[]
  permissions?: Array<{
    module: TPermissionModule
    action: TPermissionAction
  }>
  requireAll?: boolean
}

export function hasAuthorization(options: IAuthorizationOptions) {
  const middleware: MiddlewareHandler = async function (c, next) {
    const ctx = new HttpContext(c)
    const t = useTranslation(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    if (!user) {
      return ctx.unauthorized({ error: t(LocaleDictionary.http.middlewares.utils.auth.notAuthenticated) })
    }

    const db = DatabaseService.getInstance().getDb()
    const now = new Date()

    const userRolesWithPermissions = await db
      .select({
        roleName: roles.name,
        permissionModule: permissions.module,
        permissionAction: permissions.action,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        and(eq(userRoles.userId, user.id), or(isNull(userRoles.expiresAt), gt(userRoles.expiresAt, now)))
      )

    const userRoleNames = [...new Set(userRolesWithPermissions.map(r => r.roleName))]
    const userPermissions = userRolesWithPermissions
      .filter(r => r.permissionModule && r.permissionAction)
      .map(r => ({
        module: r.permissionModule as TPermissionModule,
        action: r.permissionAction as TPermissionAction,
      }))

    const { roles: requiredRoles, permissions: requiredPermissions, requireAll = false } = options

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRoles = requireAll
        ? requiredRoles.every(role => userRoleNames.includes(role))
        : requiredRoles.some(role => userRoleNames.includes(role))

      if (!hasRoles) {
        return ctx.forbidden({ error: t(LocaleDictionary.http.middlewares.utils.auth.insufficientRoles) })
      }
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermissions = requireAll
        ? requiredPermissions.every(required =>
            userPermissions.some(p => p.module === required.module && p.action === required.action)
          )
        : requiredPermissions.some(required =>
            userPermissions.some(p => p.module === required.module && p.action === required.action)
          )

      if (!hasPermissions) {
        return ctx.forbidden({ error: t(LocaleDictionary.http.middlewares.utils.auth.insufficientPermissions) })
      }
    }

    await next()
  }

  return middleware
}
