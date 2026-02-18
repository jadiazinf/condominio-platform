import type { MiddlewareHandler } from 'hono'
import { useTranslation } from '@intlify/hono'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { HttpContext } from '@http/context'
import { DatabaseService } from '@database/service'
import { userRoles, roles } from '@database/drizzle/schema'
import { AUTHENTICATED_USER_PROP } from './is-user-authenticated'
import { LocaleDictionary } from '@locales/dictionary'
import { env } from '@config/environment'

export const CONDOMINIUM_ID_PROP = 'condominiumId'
export const USER_ROLE_PROP = 'userRole'
export const MANAGEMENT_COMPANY_ID_PROP = 'managementCompanyId'

declare module 'hono' {
  interface ContextVariableMap {
    [CONDOMINIUM_ID_PROP]: string
    [USER_ROLE_PROP]: string
    [MANAGEMENT_COMPANY_ID_PROP]: string
  }
}

const SUPERADMIN_ROLE = 'SUPERADMIN'

// UUID v4 regex for basic validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Middleware factory that verifies the authenticated user has one of the allowed roles.
 * Must be used AFTER authMiddleware in the middleware chain.
 *
 * Scope detection order:
 * 1. SUPERADMIN: checks user_roles for global SUPERADMIN role (all scope cols NULL).
 * 2. Management Company: if `:managementCompanyId` route param exists, checks user_roles
 *    for a matching role scoped to that management company.
 * 3. Condominium: reads `x-condominium-id` header and checks user_roles
 *    for a matching role in that condominium.
 *
 * Sets `condominiumId`/`managementCompanyId` and `userRole` in the Hono context on success.
 *
 * @param allowedRoles - Uppercase role names: 'SUPERADMIN', 'ADMIN', 'ACCOUNTANT', 'SUPPORT', 'USER', 'VIEWER'
 */
export function requireRole(...allowedRoles: string[]): MiddlewareHandler {
  return async (c, next) => {
    // In test mode, bypass DB role check (controller tests use mock repos, no real DB)
    // Set TEST_REQUIRE_ROLE_MIDDLEWARE=true to test the real middleware
    if (env.NODE_ENV === 'test' && !env.TEST_REQUIRE_ROLE_MIDDLEWARE) {
      const role = allowedRoles[0] || SUPERADMIN_ROLE
      c.set(USER_ROLE_PROP, role)
      if (role !== SUPERADMIN_ROLE) {
        // Check for management company scope first
        const managementCompanyId = c.req.param('managementCompanyId')
        if (managementCompanyId) {
          c.set(MANAGEMENT_COMPANY_ID_PROP, managementCompanyId)
        } else {
          const condominiumId = c.req.header('x-condominium-id')
          if (condominiumId) {
            c.set(CONDOMINIUM_ID_PROP, condominiumId)
          }
        }
      }
      await next()
      return
    }

    const ctx = new HttpContext(c)
    const t = useTranslation(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    if (!user) {
      return ctx.unauthorized({
        error: t(LocaleDictionary.http.middlewares.utils.auth.notAuthenticated),
      })
    }

    const db = DatabaseService.getInstance().getDb()

    // --- SUPERADMIN path ---
    if (allowedRoles.includes(SUPERADMIN_ROLE)) {
      const superadminResult = await db
        .select({ roleName: roles.name, isActive: userRoles.isActive })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(
          and(
            eq(userRoles.userId, user.id),
            eq(roles.name, SUPERADMIN_ROLE),
            isNull(userRoles.condominiumId),
            isNull(userRoles.buildingId),
            isNull(userRoles.managementCompanyId)
          )
        )
        .limit(1)

      if (superadminResult[0] && superadminResult[0].isActive) {
        // SUPERADMIN authenticated — propagate scope IDs from params/headers
        c.set(USER_ROLE_PROP, SUPERADMIN_ROLE)
        const managementCompanyId = c.req.param('managementCompanyId')
        if (managementCompanyId) {
          c.set(MANAGEMENT_COMPANY_ID_PROP, managementCompanyId)
        }
        const condominiumId = c.req.header('x-condominium-id')
        if (condominiumId) {
          c.set(CONDOMINIUM_ID_PROP, condominiumId)
        }
        await next()
        return
      }
    }

    const nonSuperadminRoles = allowedRoles.filter(r => r !== SUPERADMIN_ROLE)

    // --- Management Company path ---
    // Detect MC scope from route param :managementCompanyId or x-management-company-id header
    const managementCompanyId = c.req.param('managementCompanyId') || c.req.header('x-management-company-id')

    if (managementCompanyId) {
      if (!UUID_REGEX.test(managementCompanyId)) {
        return ctx.badRequest({
          error: t(LocaleDictionary.http.middlewares.utils.auth.invalidManagementCompanyParamFormat),
        })
      }

      if (nonSuperadminRoles.length > 0) {
        const mcResult = await db
          .select({ roleName: roles.name })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(
            and(
              eq(userRoles.userId, user.id),
              eq(userRoles.managementCompanyId, managementCompanyId),
              eq(userRoles.isActive, true),
              inArray(roles.name, nonSuperadminRoles)
            )
          )
          .limit(1)

        if (mcResult[0]) {
          c.set(MANAGEMENT_COMPANY_ID_PROP, managementCompanyId)
          c.set(USER_ROLE_PROP, mcResult[0].roleName.toUpperCase())
          const condominiumId = c.req.header('x-condominium-id')
          if (condominiumId) {
            c.set(CONDOMINIUM_ID_PROP, condominiumId)
          }
          await next()
          return
        }
      }

      // MC route param/header exists but user has no matching role
      return ctx.forbidden({
        error: t(LocaleDictionary.http.middlewares.utils.auth.insufficientRoles),
      })
    }

    // --- Condominium roles path ---
    if (nonSuperadminRoles.length === 0) {
      // Only SUPERADMIN was allowed and user is not one
      return ctx.forbidden({
        error: t(LocaleDictionary.http.middlewares.utils.auth.insufficientRoles),
      })
    }

    // Read condominium ID from header
    const condominiumId = c.req.header('x-condominium-id')

    if (!condominiumId) {
      return ctx.badRequest({
        error: t(LocaleDictionary.http.middlewares.utils.auth.missingCondominiumHeader),
      })
    }

    if (!UUID_REGEX.test(condominiumId)) {
      return ctx.badRequest({
        error: t(LocaleDictionary.http.middlewares.utils.auth.invalidCondominiumHeaderFormat),
      })
    }

    // Check if user has one of the allowed roles in this condominium
    const userRoleResult = await db
      .select({ roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          eq(userRoles.userId, user.id),
          eq(userRoles.condominiumId, condominiumId),
          eq(userRoles.isActive, true),
          inArray(roles.name, nonSuperadminRoles)
        )
      )
      .limit(1)

    if (!userRoleResult[0]) {
      return ctx.forbidden({
        error: t(LocaleDictionary.http.middlewares.utils.auth.insufficientRoles),
      })
    }

    const userRoleName = userRoleResult[0].roleName.toUpperCase()

    // Set context variables for downstream handlers
    c.set(CONDOMINIUM_ID_PROP, condominiumId)
    c.set(USER_ROLE_PROP, userRoleName)

    await next()
  }
}
