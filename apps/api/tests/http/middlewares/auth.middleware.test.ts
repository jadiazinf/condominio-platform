import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import { isUserAuthenticated } from '@http/middlewares/utils/auth/is-user-authenticated'
import { env } from '@config/environment'
import { applyI18nMiddleware } from '@http/middlewares/locales'
import {
  beginTestTransaction,
  startTestContainer,
  stopTestContainer,
  type TTestDrizzleClient,
} from '../../setup/test-container'
import { UsersRepository } from '@database/repositories/users.repository'
import { DatabaseService } from '@database/service'
import { UserFactory } from '../../setup/factories'

// Test user credentials from environment
const TEST_USER_FIREBASE_UID = process.env.TEST_USER_FIREBASE_UID || 'n1Fx5t4aCWdh4r6XUDnhtOtw4Tj1'
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'jesusdesk@gmail.com'
const TEST_JWT_TOKEN = process.env.TEST_JWT_TOKEN || ''

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
  let rollback: () => Promise<void>

  beforeAll(async () => {
    // Enable full auth middleware testing (disable bypass)
    env.TEST_AUTH_MIDDLEWARE = 'true'
    db = await startTestContainer()
  })

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    if (!db) throw new Error('Database not initialized')

    // Use transaction-based isolation (faster than TRUNCATE)
    const tx = await beginTestTransaction()
    rollback = tx.rollback

    // Inject test DB into DatabaseService singleton
    DatabaseService.getInstance().setDb(db)

    usersRepo = new UsersRepository(db)

    app = new Hono()
    applyI18nMiddleware(app)

    // Use the actual middleware function directly (not through the module alias that gets mocked)
    app.use('/protected', isUserAuthenticated)
    app.get('/protected', c => c.json({ user: c.get('user') }))
  })

  afterEach(async () => {
    // Rollback transaction to restore clean state
    await rollback()
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
      headers: { Authorization: `Bearer ${TEST_JWT_TOKEN}` },
    })
    expect(res.status).toBe(StatusCodes.UNAUTHORIZED)
    const body = (await res.json()) as IAuthResponse
    expect(body.error).toBeDefined()
  })

  it('should return 403 if user is inactive', async () => {
    const userData = UserFactory.inactive({
      firebaseUid: TEST_USER_FIREBASE_UID,
      email: TEST_USER_EMAIL,
    })
    await usersRepo.create(userData)

    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${TEST_JWT_TOKEN}` },
    })
    expect(res.status).toBe(StatusCodes.FORBIDDEN)
    const body = (await res.json()) as IAuthResponse
    expect(body.error).toBeDefined()
  })

  it('should return 200 and set user in context if authenticated', async () => {
    const userData = UserFactory.create({
      firebaseUid: TEST_USER_FIREBASE_UID,
      email: TEST_USER_EMAIL,
      isActive: true,
    })
    const user = await usersRepo.create(userData)

    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${TEST_JWT_TOKEN}` },
    })
    expect(res.status).toBe(StatusCodes.OK)
    const body = (await res.json()) as IAuthResponse
    expect(body.user?.id).toBe(user.id)
    expect(body.user?.firebaseUid).toBe(TEST_USER_FIREBASE_UID)
  })
})
