import type { MiddlewareHandler } from 'hono'
import { useTranslation } from '@intlify/hono'
import { eq, and, isNotNull } from 'drizzle-orm'
import { HttpContext } from '@http/context'
import { DatabaseService } from '@database/service'
import { SuperadminUsersRepository, SupportTicketsRepository } from '@database/repositories'
import { userRoles, condominiums } from '@database/drizzle/schema'
import { AUTHENTICATED_USER_PROP } from './is-user-authenticated'
import { LocaleDictionary } from '@locales/dictionary'

export const TICKET_PROP = 'ticket'

/**
 * Factory function to create a ticket access middleware with configurable param name.
 * @param paramName The name of the URL param containing the ticket ID (default: 'id')
 */
export function createCanAccessTicket(paramName: string = 'id'): MiddlewareHandler {
  return async (c, next) => {
    const ctx = new HttpContext(c)
    const t = useTranslation(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    if (!user) {
      return ctx.unauthorized({
        error: t(LocaleDictionary.http.middlewares.utils.auth.notAuthenticated),
      })
    }

    // Get ticket ID from params
    const ticketId = c.req.param(paramName)
    if (!ticketId) {
      return ctx.badRequest({
        error: t(LocaleDictionary.http.validation.invalidTicketIdFormat),
      })
    }

    const db = DatabaseService.getInstance().getDb()
    const ticketsRepository = new SupportTicketsRepository(db)

    // Get the ticket
    const ticket = await ticketsRepository.getById(ticketId)
    if (!ticket) {
      return ctx.notFound({
        error: t(LocaleDictionary.http.controllers.supportTickets.ticketNotFound),
      })
    }

    // Check if user is a superadmin
    const superadminUsersRepository = new SuperadminUsersRepository(db)
    const superadminUser = await superadminUsersRepository.getByUserId(user.id)

    if (superadminUser?.isActive) {
      // Superadmin has full access
      c.set(TICKET_PROP, ticket)
      await next()
      return
    }

    // For non-superadmin users, check if they have access via condominium
    // User must have a userRole with condominiumId where that condominium
    // belongs to the ticket's managementCompanyId

    // Get user's roles that have a condominiumId
    const userRolesWithCondominium = await db
      .select({
        condominiumId: userRoles.condominiumId,
        managementCompanyId: condominiums.managementCompanyId,
      })
      .from(userRoles)
      .innerJoin(condominiums, eq(userRoles.condominiumId, condominiums.id))
      .where(
        and(
          eq(userRoles.userId, user.id),
          isNotNull(userRoles.condominiumId),
          eq(condominiums.managementCompanyId, ticket.managementCompanyId)
        )
      )
      .limit(1)

    if (userRolesWithCondominium.length === 0) {
      return ctx.forbidden({
        error: t(LocaleDictionary.http.middlewares.utils.auth.noTicketAccess),
      })
    }

    // User has access via their condominium
    c.set(TICKET_PROP, ticket)
    await next()
  }
}

/**
 * Middleware that verifies if the authenticated user can access a support ticket.
 * Must be used after isUserAuthenticated middleware.
 *
 * Access is granted if:
 * - User is an active superadmin, OR
 * - User has a userRole with condominiumId where that condominium
 *   belongs to the ticket's managementCompanyId (non-general user)
 *
 * Sets the ticket in context variable 'ticket' for downstream handlers.
 * Uses 'id' as the param name by default.
 */
export const canAccessTicket: MiddlewareHandler = createCanAccessTicket('id')

/**
 * Middleware for ticket access using 'ticketId' param.
 * Use this for routes like /support-tickets/:ticketId/messages
 */
export const canAccessTicketByTicketId: MiddlewareHandler = createCanAccessTicket('ticketId')

/**
 * Middleware that verifies if the authenticated user can modify a support ticket.
 * Must be used after isUserAuthenticated middleware.
 *
 * Only superadmins can modify tickets (status, priority, assign, resolve, close, cancel).
 */
export const canModifyTicket: MiddlewareHandler = async (c, next) => {
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

  await next()
}
