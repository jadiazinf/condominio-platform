import type { MiddlewareHandler } from 'hono'
import { useTranslation } from '@intlify/hono'
import { admin } from '@libs/firebase/config'
import type { TUser } from '@packages/domain'
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
  const ctx = new HttpContext(c)
  const t = useTranslation(c)
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ctx.unauthorized({ error: t(LocaleDictionary.http.middlewares.utils.auth.malformedHeader) })
  }

  const token = authHeader.slice(7)

  try {
    const decodedToken = await admin.auth().verifyIdToken(token)

    const db = DatabaseService.getInstance().getDb()
    const usersRepository = new UsersRepository(db)
    const user = await usersRepository.getByFirebaseUid(decodedToken.uid)

    if (!user) {
      return ctx.unauthorized({ error: t(LocaleDictionary.http.middlewares.utils.auth.userNotFound) })
    }

    if (!user.isActive) {
      return ctx.forbidden({ error: t(LocaleDictionary.http.middlewares.utils.auth.userDisabled) })
    }

    c.set(AUTHENTICATED_USER_PROP, user)
    await next()
  } catch {
    return ctx.unauthorized({ error: t(LocaleDictionary.http.middlewares.utils.auth.invalidToken) })
  }
}
