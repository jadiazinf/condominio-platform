import type { MiddlewareHandler } from 'hono'
import { useTranslation } from '@intlify/hono'
import { admin } from '@libs/firebase/config'
import type { TUser } from '@packages/domain'
import { ApiErrorCodes } from '@packages/http-client'
import { HttpContext } from '@http/context'
import { DatabaseService } from '@database/service'
import { UsersRepository } from '@database/repositories/users.repository'
import { LocaleDictionary } from '@locales/dictionary'

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
  // In test mode, bypass authentication and use a mock user
  // BUT only if we're NOT testing the auth middleware itself
  if (process.env.NODE_ENV === 'test' && !process.env.TEST_AUTH_MIDDLEWARE) {
    const mockUser: TUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'auth@test.com',
      firebaseUid: 'firebase-uid-1',
      isActive: true,
      displayName: 'Test User',
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
