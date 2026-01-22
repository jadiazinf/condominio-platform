import type { MiddlewareHandler } from 'hono'
import { useTranslation } from '@intlify/hono'
import { admin } from '@libs/firebase/config'
import { ApiErrorCodes } from '@packages/http-client'
import { HttpContext } from '@http/context'
import { LocaleDictionary } from '@locales/dictionary'

export const DECODED_TOKEN_PROP = 'decodedToken'

declare module 'hono' {
  interface ContextVariableMap {
    [DECODED_TOKEN_PROP]: {
      uid: string
      email?: string
    }
  }
}

/**
 * Middleware that only verifies the Firebase token is valid.
 * Unlike authMiddleware, this does NOT check if the user exists in the database.
 * Use this for endpoints that need to handle users that don't exist yet or need sync.
 */
export async function isTokenValid(
  c: Parameters<MiddlewareHandler>[0],
  next: Parameters<MiddlewareHandler>[1]
) {
  const ctx = new HttpContext(c)
  const t = useTranslation(c)
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ctx.unauthorizedWithCode(
      ApiErrorCodes.MALFORMED_HEADER,
      t(LocaleDictionary.http.middlewares.utils.auth.malformedHeader)
    )
  }

  const token = authHeader.slice(7)

  try {
    const decodedToken = await admin.auth().verifyIdToken(token)

    c.set(DECODED_TOKEN_PROP, {
      uid: decodedToken.uid,
      email: decodedToken.email,
    })

    await next()
  } catch {
    return ctx.unauthorizedWithCode(
      ApiErrorCodes.INVALID_TOKEN,
      t(LocaleDictionary.http.middlewares.utils.auth.invalidToken)
    )
  }
}
