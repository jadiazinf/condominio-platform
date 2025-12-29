import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import { isUserAuthenticated } from '@http/middlewares/utils/auth/is-user-authenticated'
import { applyI18nMiddleware } from '@http/middlewares/locales'
import {
  cleanDatabase,
  startTestContainer,
  stopTestContainer,
  type TTestDrizzleClient,
} from '../../setup/test-container'
import { UsersRepository } from '@database/repositories/users.repository'
import { DatabaseService } from '@database/service'
import { UserFactory } from '../../setup/factories'

interface IAuthResponse {
  user?: {
    id: string
    firebaseUid: string
  }
  error?: string
}

describe('Auth Middleware', () => {
  let app: Hono
  let db: TTestDrizzleClient
  let usersRepo: UsersRepository

  beforeAll(async () => {
    db = await startTestContainer()
  })

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    if (!db) throw new Error('Database not initialized')
    await cleanDatabase(db)

    // Inject test DB into DatabaseService singleton
    DatabaseService.getInstance().setDb(db)

    usersRepo = new UsersRepository(db)

    app = new Hono()
    applyI18nMiddleware(app)

    // Use the actual middleware function directly (not through the module alias that gets mocked)
    app.use('/protected', isUserAuthenticated)
    app.get('/protected', c => c.json({ user: c.get('user') }))
  })

  it('should return 401 if Authorization header is missing', async () => {
    const res = await app.request('/protected')
    expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    const body = (await res.json()) as IAuthResponse
    expect(body.error).toBeDefined()
  })

  it('should return 401 if Authorization header is malformed', async () => {
    const res = await app.request('/protected', {
      headers: { Authorization: 'Basic 123' },
    })
    expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    const body = (await res.json()) as IAuthResponse
    expect(body.error).toBeDefined()
  })

  it('should return 401 if user does not exist in DB', async () => {
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer valid-token' },
    })
    expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    const body = (await res.json()) as IAuthResponse
    expect(body.error).toBeDefined()
  })

  it('should return 403 if user is inactive', async () => {
    const uid = 'inactive-user'
    const userData = UserFactory.inactive({ firebaseUid: uid })
    await usersRepo.create(userData)

    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer placeholder-token:${uid}` },
    })
    expect(res.status).toBe(StatusCodes.FORBIDDEN)
    const body = (await res.json()) as IAuthResponse
    expect(body.error).toBeDefined()
  })

  it('should return 200 and set user in context if authenticated', async () => {
    const uid = 'active-user'
    const userData = UserFactory.create({ firebaseUid: uid, isActive: true })
    const user = await usersRepo.create(userData)

    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer placeholder-token:${uid}` },
    })
    expect(res.status).toBe(StatusCodes.OK)
    const body = (await res.json()) as IAuthResponse
    expect(body.user?.id).toBe(user.id)
    expect(body.user?.firebaseUid).toBe(uid)
  })
})
