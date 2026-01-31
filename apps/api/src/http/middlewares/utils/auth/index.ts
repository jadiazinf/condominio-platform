export { isUserAuthenticated, AUTHENTICATED_USER_PROP } from './is-user-authenticated'
export { isTokenValid, DECODED_TOKEN_PROP } from './is-token-valid'
export { hasAuthorization, type IAuthorizationOptions } from './has-authorization'
export { isSuperadmin, SUPERADMIN_USER_PROP } from './is-superadmin'
export {
  hasSuperadminPermission,
  requireSuperadminPermission,
  type ISuperadminPermissionOptions,
} from './has-superadmin-permission'
export {
  canAccessTicket,
  canAccessTicketByTicketId,
  canModifyTicket,
  createCanAccessTicket,
  TICKET_PROP,
} from './can-access-ticket'
