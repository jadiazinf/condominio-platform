import type { MiddlewareHandler } from 'hono'
import { useTranslation } from '@intlify/hono'
import { eq, and, isNull, or, gt, inArray } from 'drizzle-orm'
import { HttpContext } from '@http/context'
import { DatabaseService } from '@database/service'
import {
  userRoles,
  roles,
  unitOwnerships,
  units,
  buildings,
  condominiums,
  condominiumManagementCompanies,
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
 * 2. That condominium belongs to a management company (via junction table)
 * 3. The target user has a unit ownership in any condominium managed by that same company
 */
async function checkManagementCompanyAdminAccess(
  authenticatedUserId: string,
  targetUserId: string,
  adminRoles: string[]
): Promise<boolean> {
  const db = DatabaseService.getInstance().getDb()
  const now = new Date()

  // Step 1: Find condominiums where the authenticated user has an admin role
  const adminCondominiums = await db
    .selectDistinct({
      condominiumId: userRoles.condominiumId,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        eq(userRoles.userId, authenticatedUserId),
        or(...adminRoles.map(roleName => eq(roles.name, roleName))),
        or(isNull(userRoles.expiresAt), gt(userRoles.expiresAt, now))
      )
    )

  if (adminCondominiums.length === 0) {
    return false
  }

  const adminCondominiumIds = adminCondominiums
    .map(c => c.condominiumId)
    .filter((id): id is string => id !== null)

  if (adminCondominiumIds.length === 0) {
    return false
  }

  // Step 2: Find management companies that manage those condominiums (via junction table)
  const adminManagementCompanies = await db
    .selectDistinct({
      managementCompanyId: condominiumManagementCompanies.managementCompanyId,
    })
    .from(condominiumManagementCompanies)
    .where(inArray(condominiumManagementCompanies.condominiumId, adminCondominiumIds))

  if (adminManagementCompanies.length === 0) {
    return false
  }

  const managementCompanyIds = adminManagementCompanies.map(mc => mc.managementCompanyId)

  // Step 3: Find all condominiums managed by those companies (via junction table)
  const managedCondominiums = await db
    .selectDistinct({
      condominiumId: condominiumManagementCompanies.condominiumId,
    })
    .from(condominiumManagementCompanies)
    .where(inArray(condominiumManagementCompanies.managementCompanyId, managementCompanyIds))

  if (managedCondominiums.length === 0) {
    return false
  }

  const managedCondominiumIds = managedCondominiums.map(c => c.condominiumId)

  // Step 4: Check if target user has a unit in any of those condominiums
  const targetUserUnits = await db
    .selectDistinct({
      condominiumId: buildings.condominiumId,
    })
    .from(unitOwnerships)
    .innerJoin(units, eq(unitOwnerships.unitId, units.id))
    .innerJoin(buildings, eq(units.buildingId, buildings.id))
    .where(
      and(
        eq(unitOwnerships.userId, targetUserId),
        eq(unitOwnerships.isActive, true),
        inArray(buildings.condominiumId, managedCondominiumIds)
      )
    )

  return targetUserUnits.length > 0
}
