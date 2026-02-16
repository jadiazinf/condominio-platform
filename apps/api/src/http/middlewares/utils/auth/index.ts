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
export {
  requireRole,
  CONDOMINIUM_ID_PROP,
  USER_ROLE_PROP,
  MANAGEMENT_COMPANY_ID_PROP,
} from './require-role'
