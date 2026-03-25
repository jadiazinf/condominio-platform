import type { MiddlewareHandler } from 'hono'
import type { TSupportTicket } from '@packages/domain'
import { useTranslation } from '@intlify/hono'
import { HttpContext } from '@http/context'
import { DatabaseService } from '@database/service'
import {
  UserRolesRepository,
  SupportTicketsRepository,
  ManagementCompanyMembersRepository,
} from '@database/repositories'
import { AUTHENTICATED_USER_PROP } from './is-user-authenticated'
import { LocaleDictionary } from '@locales/dictionary'
import type { TDrizzleClient } from '@database/repositories/interfaces'

export const TICKET_PROP = 'ticket'

/**
 * Shared ticket access check — reusable by HTTP middleware and WebSocket handler.
 *
 * Returns true if user can access the ticket, false otherwise.
 *
 * Access rules by channel:
 * - SUPERADMIN: always allowed
 * - Creator of the ticket: always allowed
 * - `resident_to_admin`: admins/members of the ticket's managementCompanyId can access
 * - `resident_to_support`: only creator + SUPERADMIN
 * - `admin_to_support`: only creator + SUPERADMIN
 */
export async function checkTicketAccess(
  userId: string,
  ticket: TSupportTicket,
  db: TDrizzleClient
): Promise<boolean> {
  const userRolesRepository = new UserRolesRepository(db)

  // 1. Superadmin always has access
  const isSuperadmin = await userRolesRepository.isUserSuperadmin(userId)
  if (isSuperadmin) return true

  // 2. Creator always has access to their own ticket
  if (ticket.createdByUserId === userId) return true

  // 3. Channel-based access
  switch (ticket.channel) {
    case 'resident_to_admin': {
      // Admins/members of the management company can see resident→admin tickets
      const membersRepo = new ManagementCompanyMembersRepository(db)
      const member = await membersRepo.getByCompanyAndUser(ticket.managementCompanyId, userId)
      return !!member
    }

    case 'resident_to_support':
    case 'admin_to_support':
      // Only creator + superadmin (already checked above)
      return false

    default:
      return false
  }
}

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

    const hasAccess = await checkTicketAccess(user.id, ticket, db)

    if (!hasAccess) {
      return ctx.forbidden({
        error: t(LocaleDictionary.http.middlewares.utils.auth.noTicketAccess),
      })
    }

    c.set(TICKET_PROP, ticket)
    await next()
  }
}

/**
 * Middleware that verifies if the authenticated user can access a support ticket.
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
  const userRolesRepository = new UserRolesRepository(db)

  const isSuperadmin = await userRolesRepository.isUserSuperadmin(user.id)

  if (!isSuperadmin) {
    return ctx.forbidden({
      error: t(LocaleDictionary.http.middlewares.utils.auth.notSuperadmin),
    })
  }

  await next()
}

/**
 * Middleware that verifies if the authenticated user can manage a support ticket.
 *
 * Management rules by channel:
 * - `resident_to_admin`: superadmins OR management company members can manage
 * - `resident_to_support`: only superadmins
 * - `admin_to_support`: only superadmins
 *
 * This middleware loads the ticket and sets it on context as TICKET_PROP.
 */
export function createCanManageTicket(paramName: string = 'id'): MiddlewareHandler {
  return async (c, next) => {
    const ctx = new HttpContext(c)
    const t = useTranslation(c)
    const user = c.get(AUTHENTICATED_USER_PROP)

    if (!user) {
      return ctx.unauthorized({
        error: t(LocaleDictionary.http.middlewares.utils.auth.notAuthenticated),
      })
    }

    const db = DatabaseService.getInstance().getDb()
    const userRolesRepository = new UserRolesRepository(db)

    // Superadmins can always manage any ticket
    const isSuperadmin = await userRolesRepository.isUserSuperadmin(user.id)
    if (isSuperadmin) {
      await next()
      return
    }

    // For non-superadmins, load the ticket and check channel-based access
    const ticketId = c.req.param(paramName)
    if (!ticketId) {
      return ctx.badRequest({
        error: t(LocaleDictionary.http.validation.invalidTicketIdFormat),
      })
    }

    const ticketsRepository = new SupportTicketsRepository(db)
    const ticket = await ticketsRepository.getById(ticketId)

    if (!ticket) {
      return ctx.notFound({
        error: t(LocaleDictionary.http.controllers.supportTickets.ticketNotFound),
      })
    }

    // Only resident_to_admin tickets can be managed by non-superadmins
    if (ticket.channel !== 'resident_to_admin') {
      return ctx.forbidden({
        error: t(LocaleDictionary.http.middlewares.utils.auth.noTicketAccess),
      })
    }

    // Check if user is a member of the ticket's management company
    const membersRepo = new ManagementCompanyMembersRepository(db)
    const member = await membersRepo.getByCompanyAndUser(ticket.managementCompanyId, user.id)

    if (!member) {
      return ctx.forbidden({
        error: t(LocaleDictionary.http.middlewares.utils.auth.noTicketAccess),
      })
    }

    c.set(TICKET_PROP, ticket)
    await next()
  }
}

export const canManageTicket: MiddlewareHandler = createCanManageTicket('id')
