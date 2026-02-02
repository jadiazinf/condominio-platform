import type { MiddlewareHandler } from 'hono'
import { useTranslation } from '@intlify/hono'
import { eq } from 'drizzle-orm'
import { HttpContext } from '@http/context'
import { DatabaseService } from '@database/service'
import { rolePermissions, permissions } from '@database/drizzle/schema'
import { SUPERADMIN_USER_PROP } from './is-superadmin'
import { LocaleDictionary } from '@locales/dictionary'
import type { TAllPermissionModule, TPermissionAction } from '@packages/domain'

export interface ISuperadminPermissionOptions {
  permissions: Array<{
    module: TAllPermissionModule
    action: TPermissionAction
  }>
  requireAll?: boolean
}

/**
 * Middleware that verifies if the superadmin user has specific permissions.
 * Must be used after isSuperadmin middleware.
 *
 * Permissions are now obtained from role_permissions based on the SUPERADMIN role.
 *
 * @param options.permissions - Array of required permissions (module + action)
 * @param options.requireAll - If true, all permissions are required. If false (default), any one permission is sufficient.
 */
export function hasSuperadminPermission(options: ISuperadminPermissionOptions) {
  const middleware: MiddlewareHandler = async (c, next) => {
    const ctx = new HttpContext(c)
    const t = useTranslation(c)
    const superadminUser = c.get(SUPERADMIN_USER_PROP)

    if (!superadminUser) {
      return ctx.forbidden({
        error: t(LocaleDictionary.http.middlewares.utils.auth.notSuperadmin),
      })
    }

    const db = DatabaseService.getInstance().getDb()

    // Get all permissions for the superadmin's role from role_permissions
    const userPermissions = await db
      .select({
        module: permissions.module,
        action: permissions.action,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, superadminUser.roleId))

    const { permissions: requiredPermissions, requireAll = false } = options

    const hasPermissions = requireAll
      ? requiredPermissions.every(required =>
          userPermissions.some(p => p.module === required.module && p.action === required.action)
        )
      : requiredPermissions.some(required =>
          userPermissions.some(p => p.module === required.module && p.action === required.action)
        )

    if (!hasPermissions) {
      return ctx.forbidden({
        error: t(LocaleDictionary.http.middlewares.utils.auth.insufficientSuperadminPermissions),
      })
    }

    await next()
  }

  return middleware
}

/**
 * Middleware that checks if superadmin has a specific permission by module and action.
 * Shorthand for hasSuperadminPermission with a single permission.
 */
export function requireSuperadminPermission(module: TAllPermissionModule, action: TPermissionAction) {
  return hasSuperadminPermission({
    permissions: [{ module, action }],
    requireAll: true,
  })
}
