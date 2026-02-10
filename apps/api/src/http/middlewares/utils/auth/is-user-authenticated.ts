import type { MiddlewareHandler } from 'hono'
import { useTranslation } from '@intlify/hono'
import { admin } from '@libs/firebase/config'
import type { TUser } from '@packages/domain'
import { ApiErrorCodes } from '@packages/http-client'
import { HttpContext } from '@http/context'
import { DatabaseService } from '@database/service'
import { UsersRepository } from '@database/repositories/users.repository'
import { LocaleDictionary } from '@locales/dictionary'
import { env } from '@config/environment'

export const AUTHENTICATED_USER_PROP = 'user'

declare module 'hono' {
  interface ContextVariableMap {
    [AUTHENTICATED_USER_PROP]: TUser
  }
}

export async function isUserAuthenticated(
  c: Parameters<MiddlewareHandler>[0],
  next: Parameters<MiddlewareHandler>[1]
) {
  // In test mode, bypass Firebase token verification
  // BUT only if we're NOT testing the auth middleware itself
  if (env.NODE_ENV === 'test' && !env.TEST_AUTH_MIDDLEWARE) {
    const authHeader = c.req.header('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    // If the token looks like a UUID, treat it as a userId and look up the real user
    // This allows authorization tests to control which user makes each request
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (token && UUID_REGEX.test(token)) {
      const db = DatabaseService.getInstance().getDb()
      const usersRepository = new UsersRepository(db)
      const user = await usersRepository.getById(token)
      if (user) {
        c.set(AUTHENTICATED_USER_PROP, user)
        await next()
        return
      }
    }

    // Fallback: use hardcoded mock user for backward-compatible controller tests
    const mockUser: TUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'auth@test.com',
      firebaseUid: 'firebase-uid-1',
      isActive: true,
      displayName: 'Test User',
      phoneCountryCode: null,
      phoneNumber: null,
      photoUrl: null,
      firstName: 'Test',
      lastName: 'User',
      idDocumentType: null,
      idDocumentNumber: null,
      address: null,
      locationId: null,
      preferredLanguage: 'es',
      preferredCurrencyId: null,
      isEmailVerified: true,
      lastLogin: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    c.set(AUTHENTICATED_USER_PROP, mockUser)
    await next()
    return
  }

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

    const db = DatabaseService.getInstance().getDb()
    const usersRepository = new UsersRepository(db)
    const user = await usersRepository.getByFirebaseUid(decodedToken.uid)

    if (!user) {
      return ctx.unauthorizedWithCode(
        ApiErrorCodes.USER_NOT_REGISTERED,
        t(LocaleDictionary.http.middlewares.utils.auth.userNotFound)
      )
    }

    if (!user.isActive) {
      return ctx.forbiddenWithCode(
        ApiErrorCodes.USER_DISABLED,
        t(LocaleDictionary.http.middlewares.utils.auth.userDisabled)
      )
    }

    c.set(AUTHENTICATED_USER_PROP, user)
    await next()
  } catch {
    return ctx.unauthorizedWithCode(
      ApiErrorCodes.INVALID_TOKEN,
      t(LocaleDictionary.http.middlewares.utils.auth.invalidToken)
    )
  }
}
