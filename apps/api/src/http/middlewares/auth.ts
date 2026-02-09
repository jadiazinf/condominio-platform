import { isUserAuthenticated } from './utils/auth/is-user-authenticated'
import { isTokenValid } from './utils/auth/is-token-valid'

export const authMiddleware = isUserAuthenticated
export const tokenOnlyMiddleware = isTokenValid
export { requireRole, CONDOMINIUM_ID_PROP, USER_ROLE_PROP } from './utils/auth/require-role'
