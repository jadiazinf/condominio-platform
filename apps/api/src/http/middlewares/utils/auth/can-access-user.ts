import type { MiddlewareHandler } from 'hono'
import { useTranslation } from '@intlify/hono'
import { eq, and, isNull, or, gt } from 'drizzle-orm'
import { HttpContext } from '@http/context'
import { DatabaseService } from '@database/service'
import {
  userRoles,
  roles,
  unitOwnerships,
  units,
  buildings,
  condominiums,
} from '@database/drizzle/schema'
import { AUTHENTICATED_USER_PROP } from './is-user-authenticated'
import { LocaleDictionary } from '@locales/dictionary'

export interface ICanAccessUserOptions {
  userIdParam?: string
  adminRoles?: string[]
}

const DEFAULT_ADMIN_ROLES = ['admin', 'administrator', 'super_admin']

/**
 * Middleware that restricts access to user information.
 *
 * Access is granted if:
 * 1. The authenticated user is accessing their own information (self-access)
 * 2. The authenticated user is an admin of a management company that manages
 *    a condominium where the target user has a unit ownership
 *
 * @param options Configuration options
 * @param options.userIdParam The route parameter name containing the target user ID (default: 'id')
 * @param options.adminRoles Role names considered as admin roles (default: ['admin', 'administrator', 'super_admin'])
 */
export function canAccessUser(options: ICanAccessUserOptions = {}) {
  const { userIdParam = 'id', adminRoles = DEFAULT_ADMIN_ROLES } = options

  const middleware: MiddlewareHandler = async (c, next) => {
    const ctx = new HttpContext(c)
    const t = useTranslation(c)
    const authenticatedUser = c.get(AUTHENTICATED_USER_PROP)

    if (!authenticatedUser) {
      return ctx.unauthorized({
        error: t(LocaleDictionary.http.middlewares.utils.auth.notAuthenticated),
      })
    }

    const targetUserId = c.req.param(userIdParam)

    if (!targetUserId) {
      return ctx.badRequest({
        error: t(LocaleDictionary.http.middlewares.utils.auth.accessDenied),
      })
    }

    // Self-access: User accessing their own information
    if (authenticatedUser.id === targetUserId) {
      await next()
      return
    }

    // Check if authenticated user is admin of a management company
    // that manages a condominium where target user has a unit
    const hasAdminAccess = await checkManagementCompanyAdminAccess(
      authenticatedUser.id,
      targetUserId,
      adminRoles
    )

    if (hasAdminAccess) {
      await next()
      return
    }

    return ctx.forbidden({
      error: t(LocaleDictionary.http.middlewares.utils.auth.accessDenied),
    })
  }

  return middleware
}

/**
 * Checks if the authenticated user has admin access to the target user's information
 * through management company administration.
 *
 * The check verifies if:
 * 1. The authenticated user has an admin role in any condominium
 * 2. That condominium belongs to a management company
 * 3. The target user has a unit ownership in any condominium managed by that same company
 */
async function checkManagementCompanyAdminAccess(
  authenticatedUserId: string,
  targetUserId: string,
  adminRoles: string[]
): Promise<boolean> {
  const db = DatabaseService.getInstance().getDb()
  const now = new Date()

  // Find management companies where the authenticated user is an admin
  // (has an admin role in a condominium that belongs to a management company)
  const adminManagementCompanies = await db
    .selectDistinct({
      managementCompanyId: condominiums.managementCompanyId,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(condominiums, eq(userRoles.condominiumId, condominiums.id))
    .where(
      and(
        eq(userRoles.userId, authenticatedUserId),
        or(...adminRoles.map(roleName => eq(roles.name, roleName))),
        or(isNull(userRoles.expiresAt), gt(userRoles.expiresAt, now))
      )
    )

  if (adminManagementCompanies.length === 0) {
    return false
  }

  const managementCompanyIds = adminManagementCompanies
    .map(mc => mc.managementCompanyId)
    .filter((id): id is string => id !== null)

  if (managementCompanyIds.length === 0) {
    return false
  }

  // Check if target user has a unit in any condominium managed by these companies
  const targetUserCondominiums = await db
    .selectDistinct({
      managementCompanyId: condominiums.managementCompanyId,
    })
    .from(unitOwnerships)
    .innerJoin(units, eq(unitOwnerships.unitId, units.id))
    .innerJoin(buildings, eq(units.buildingId, buildings.id))
    .innerJoin(condominiums, eq(buildings.condominiumId, condominiums.id))
    .where(
      and(
        eq(unitOwnerships.userId, targetUserId),
        eq(unitOwnerships.isActive, true),
        or(...managementCompanyIds.map(id => eq(condominiums.managementCompanyId, id)))
      )
    )

  return targetUserCondominiums.length > 0
}
