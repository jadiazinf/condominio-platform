import type { Hono, Env } from 'hono'
import { getAuthenticatedToken } from './firebase-auth'

export const createAuthenticatedRequest = <E extends Env>(
  app: Hono<E>,
  defaultUid: string = 'firebase-uid-1'
) => {
  return async (path: string, options: RequestInit = {}) => {
    const token = await getAuthenticatedToken(defaultUid)
    const existingHeaders = (options.headers || {}) as Record<string, string>

    const headers = {
      Authorization: `Bearer ${token}`,
      ...existingHeaders,
    }
    return app.request(path, { ...options, headers })
  }
}
