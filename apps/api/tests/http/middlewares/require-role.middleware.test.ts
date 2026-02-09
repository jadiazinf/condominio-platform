import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import { sql } from 'drizzle-orm'
import { isUserAuthenticated, AUTHENTICATED_USER_PROP } from '@http/middlewares/utils/auth/is-user-authenticated'
import { requireRole, CONDOMINIUM_ID_PROP, USER_ROLE_PROP } from '@http/middlewares/utils/auth/require-role'
import { applyI18nMiddleware } from '@http/middlewares/locales'
import {
  beginTestTransaction,
  startTestContainer,
  stopTestContainer,
  type TTestDrizzleClient,
} from '../../setup/test-container'
import { UsersRepository } from '@database/repositories/users.repository'
import { RolesRepository } from '@database/repositories/roles.repository'
import { UserRolesRepository } from '@database/repositories/user-roles.repository'
import { DatabaseService } from '@database/service'
import { UserFactory, RoleFactory, UserRoleFactory } from '../../setup/factories'

// Test response shapes
interface IProtectedResponse {
  condominiumId?: string | null
  userRole?: string | null
  userId?: string | null
  error?: string
}

describe('requireRole middleware', () => {
  let db: TTestDrizzleClient
  let rollback: () => Promise<void>
  let usersRepo: UsersRepository
  let rolesRepo: RolesRepository
  let userRolesRepo: UserRolesRepository

  // Shared seed data IDs (created per-test inside transaction)
  let superadminRoleId: string
  let adminRoleId: string
  let accountantRoleId: string
  let supportRoleId: string
  let userRoleId: string

  beforeAll(async () => {
    // Enable full requireRole middleware testing (disable bypass)
    process.env.TEST_REQUIRE_ROLE_MIDDLEWARE = 'true'
    db = await startTestContainer()
  })

  afterAll(async () => {
    delete process.env.TEST_REQUIRE_ROLE_MIDDLEWARE
    await stopTestContainer()
  })

  beforeEach(async () => {
    if (!db) throw new Error('Database not initialized')

    const tx = await beginTestTransaction()
    rollback = tx.rollback

    DatabaseService.getInstance().setDb(db)

    usersRepo = new UsersRepository(db)
    rolesRepo = new RolesRepository(db)
    userRolesRepo = new UserRolesRepository(db)

    // Seed the five system roles (UPPERCASE names as required)
    const superadminRole = await rolesRepo.create(RoleFactory.systemRole({ name: 'SUPERADMIN' }))
    const adminRole = await rolesRepo.create(RoleFactory.systemRole({ name: 'ADMIN' }))
    const accountantRole = await rolesRepo.create(RoleFactory.systemRole({ name: 'ACCOUNTANT' }))
    const supportRole = await rolesRepo.create(RoleFactory.systemRole({ name: 'SUPPORT' }))
    const userRole = await rolesRepo.create(RoleFactory.systemRole({ name: 'USER' }))

    superadminRoleId = superadminRole.id
    adminRoleId = adminRole.id
    accountantRoleId = accountantRole.id
    supportRoleId = supportRole.id
    userRoleId = userRole.id
  })

  afterEach(async () => {
    await rollback()
  })

  // Helper: build a Hono app with i18n + isUserAuthenticated + requireRole
  function buildApp(...allowedRoles: string[]): Hono {
    const app = new Hono()
    applyI18nMiddleware(app)
    app.use('/protected', isUserAuthenticated)
    app.use('/protected', requireRole(...allowedRoles))
    app.get('/protected', c => {
      return c.json({
        condominiumId: c.get(CONDOMINIUM_ID_PROP) ?? null,
        userRole: c.get(USER_ROLE_PROP) ?? null,
        userId: c.get(AUTHENTICATED_USER_PROP)?.id ?? null,
      })
    })
    return app
  }

  // Helper: create a user in DB and return their entity
  async function createUser(overrides: Parameters<typeof UserFactory.create>[0] = {}) {
    return usersRepo.create(UserFactory.create(overrides))
  }

  // Helper: create a condominium directly via raw SQL (avoids repo complexity)
  async function createCondominium(): Promise<string> {
    const id = crypto.randomUUID()
    const name = `Test Condo ${id.slice(0, 8)}`
    const code = id.slice(0, 6).toUpperCase()
    await db.execute(sql`INSERT INTO condominiums (id, name, code, is_active) VALUES (${id}, ${name}, ${code}, true)`)
    return id
  }

  // Helper: assign a role to a user
  async function assignRole(
    userId: string,
    roleId: string,
    condominiumId: string | null = null,
    isActive = true
  ) {
    if (condominiumId) {
      return userRolesRepo.create(
        UserRoleFactory.forCondominium(userId, roleId, condominiumId, { isActive })
      )
    }
    return userRolesRepo.create(UserRoleFactory.global(userId, roleId, { isActive }))
  }

  // ================================================================
  // 1. Auth bypass in test env — no token still sets mock user, so
  //    requireRole sees a user with no roles. 401 tests belong to
  //    auth.middleware.test.ts (which sets TEST_AUTH_MIDDLEWARE=true).
  //    Here we test that mock user (no roles) gets 403/400.
  // ================================================================
  describe('unauthenticated / mock user fallback', () => {
    it('should return 400 (missing header) for mock user on condominium route', async () => {
      // No Bearer UUID → mock user fallback → mock user has no roles
      // requireRole('ADMIN') tries condominium path → missing x-condominium-id → 400
      const app = buildApp('ADMIN')
      const res = await app.request('/protected')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })

    it('should return 403 for mock user on SUPERADMIN-only route', async () => {
      // Mock user has no SUPERADMIN role in DB → 403
      const app = buildApp('SUPERADMIN')
      const res = await app.request('/protected')
      expect(res.status).toBe(StatusCodes.FORBIDDEN)
    })
  })

  // ================================================================
  // 2. Non-existent user UUID falls back to mock user
  // ================================================================
  describe('with non-existent user UUID', () => {
    it('should return 403 when UUID does not match a real user (mock user fallback)', async () => {
      const condoId = await createCondominium()
      const app = buildApp('ADMIN')
      const fakeUserId = crypto.randomUUID()
      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${fakeUserId}`,
          'x-condominium-id': condoId,
        },
      })
      // Mock user has no roles → 403
      expect(res.status).toBe(StatusCodes.FORBIDDEN)
    })
  })

  // ================================================================
  // 3. SUPERADMIN path
  // ================================================================
  describe('SUPERADMIN role', () => {
    it('should allow SUPERADMIN user when SUPERADMIN is in allowedRoles', async () => {
      const user = await createUser()
      await assignRole(user.id, superadminRoleId) // global, no condominiumId

      const app = buildApp('SUPERADMIN')
      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${user.id}` },
      })

      expect(res.status).toBe(StatusCodes.OK)
      const body = (await res.json()) as IProtectedResponse
      expect(body.userRole).toBe('SUPERADMIN')
      expect(body.userId).toBe(user.id)
      // SUPERADMIN does not set condominiumId
      expect(body.condominiumId).toBeNull()
    })

    it('should reject SUPERADMIN user when SUPERADMIN is NOT in allowedRoles', async () => {
      const user = await createUser()
      await assignRole(user.id, superadminRoleId) // global
      const condoId = await createCondominium()

      // Route only allows ADMIN
      const app = buildApp('ADMIN')
      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${user.id}`,
          'x-condominium-id': condoId,
        },
      })

      // SUPERADMIN has no condominium role → 403
      expect(res.status).toBe(StatusCodes.FORBIDDEN)
    })

    it('should reject inactive SUPERADMIN role assignment', async () => {
      const user = await createUser()
      await assignRole(user.id, superadminRoleId, null, false) // inactive

      const app = buildApp('SUPERADMIN')
      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${user.id}` },
      })

      // Only SUPERADMIN was allowed and user's assignment is inactive → 403
      expect(res.status).toBe(StatusCodes.FORBIDDEN)
    })

    it('should allow SUPERADMIN on a mixed-role route without needing x-condominium-id', async () => {
      const user = await createUser()
      await assignRole(user.id, superadminRoleId)

      // Route allows both SUPERADMIN and ADMIN
      const app = buildApp('SUPERADMIN', 'ADMIN')
      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${user.id}` },
        // No x-condominium-id header
      })

      expect(res.status).toBe(StatusCodes.OK)
      const body = (await res.json()) as IProtectedResponse
      expect(body.userRole).toBe('SUPERADMIN')
    })
  })

  // ================================================================
  // 4. Missing x-condominium-id for condominium roles → 400
  // ================================================================
  describe('missing x-condominium-id header', () => {
    it('should return 400 when condominium roles are allowed but header is missing', async () => {
      const user = await createUser()
      const condoId = await createCondominium()
      await assignRole(user.id, adminRoleId, condoId)

      const app = buildApp('ADMIN')
      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${user.id}` },
        // Missing x-condominium-id
      })

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
      const body = (await res.json()) as IProtectedResponse
      expect(body.error).toContain('x-condominium-id')
    })

    it('should return 400 when x-condominium-id is not a valid UUID', async () => {
      const user = await createUser()

      const app = buildApp('ADMIN')
      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${user.id}`,
          'x-condominium-id': 'not-a-uuid',
        },
      })

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
      const body = (await res.json()) as IProtectedResponse
      expect(body.error).toContain('x-condominium-id')
    })
  })

  // ================================================================
  // 5. USER trying ADMIN route → 403
  // ================================================================
  describe('insufficient condominium role', () => {
    it('should return 403 when USER tries to access an ADMIN-only route', async () => {
      const user = await createUser()
      const condoId = await createCondominium()
      await assignRole(user.id, userRoleId, condoId)

      const app = buildApp('ADMIN')
      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${user.id}`,
          'x-condominium-id': condoId,
        },
      })

      expect(res.status).toBe(StatusCodes.FORBIDDEN)
    })

    it('should return 403 when USER tries to access an ADMIN+ACCOUNTANT route', async () => {
      const user = await createUser()
      const condoId = await createCondominium()
      await assignRole(user.id, userRoleId, condoId)

      const app = buildApp('ADMIN', 'ACCOUNTANT')
      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${user.id}`,
          'x-condominium-id': condoId,
        },
      })

      expect(res.status).toBe(StatusCodes.FORBIDDEN)
    })

    it('should return 403 when SUPPORT tries to access an ADMIN-only route', async () => {
      const user = await createUser()
      const condoId = await createCondominium()
      await assignRole(user.id, supportRoleId, condoId)

      const app = buildApp('ADMIN')
      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${user.id}`,
          'x-condominium-id': condoId,
        },
      })

      expect(res.status).toBe(StatusCodes.FORBIDDEN)
    })
  })

  // ================================================================
  // 6. ADMIN in ADMIN route → passes
  // ================================================================
  describe('authorized condominium role', () => {
    it('should allow ADMIN on an ADMIN route and set context variables', async () => {
      const user = await createUser()
      const condoId = await createCondominium()
      await assignRole(user.id, adminRoleId, condoId)

      const app = buildApp('ADMIN')
      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${user.id}`,
          'x-condominium-id': condoId,
        },
      })

      expect(res.status).toBe(StatusCodes.OK)
      const body = (await res.json()) as IProtectedResponse
      expect(body.userRole).toBe('ADMIN')
      expect(body.condominiumId).toBe(condoId)
      expect(body.userId).toBe(user.id)
    })

    it('should allow ACCOUNTANT on a route that permits ACCOUNTANT', async () => {
      const user = await createUser()
      const condoId = await createCondominium()
      await assignRole(user.id, accountantRoleId, condoId)

      const app = buildApp('ADMIN', 'ACCOUNTANT')
      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${user.id}`,
          'x-condominium-id': condoId,
        },
      })

      expect(res.status).toBe(StatusCodes.OK)
      const body = (await res.json()) as IProtectedResponse
      expect(body.userRole).toBe('ACCOUNTANT')
      expect(body.condominiumId).toBe(condoId)
    })

    it('should allow SUPPORT on a route that permits SUPPORT', async () => {
      const user = await createUser()
      const condoId = await createCondominium()
      await assignRole(user.id, supportRoleId, condoId)

      const app = buildApp('ADMIN', 'SUPPORT')
      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${user.id}`,
          'x-condominium-id': condoId,
        },
      })

      expect(res.status).toBe(StatusCodes.OK)
      const body = (await res.json()) as IProtectedResponse
      expect(body.userRole).toBe('SUPPORT')
    })

    it('should allow USER on a route that permits USER', async () => {
      const user = await createUser()
      const condoId = await createCondominium()
      await assignRole(user.id, userRoleId, condoId)

      const app = buildApp('ADMIN', 'USER')
      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${user.id}`,
          'x-condominium-id': condoId,
        },
      })

      expect(res.status).toBe(StatusCodes.OK)
      const body = (await res.json()) as IProtectedResponse
      expect(body.userRole).toBe('USER')
    })
  })

  // ================================================================
  // 7. Inactive condominium role → 403
  // ================================================================
  describe('inactive condominium role', () => {
    it('should return 403 when the user role assignment is inactive', async () => {
      const user = await createUser()
      const condoId = await createCondominium()
      await assignRole(user.id, adminRoleId, condoId, false) // inactive

      const app = buildApp('ADMIN')
      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${user.id}`,
          'x-condominium-id': condoId,
        },
      })

      expect(res.status).toBe(StatusCodes.FORBIDDEN)
    })
  })

  // ================================================================
  // 8. Wrong condominium → 403
  // ================================================================
  describe('wrong condominium', () => {
    it('should return 403 when user has role in a different condominium', async () => {
      const user = await createUser()
      const condoA = await createCondominium()
      const condoB = await createCondominium()
      await assignRole(user.id, adminRoleId, condoA)

      const app = buildApp('ADMIN')
      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${user.id}`,
          'x-condominium-id': condoB, // different condo
        },
      })

      expect(res.status).toBe(StatusCodes.FORBIDDEN)
    })
  })

  // ================================================================
  // 9. SUPERADMIN attempting condominium route (no SUPERADMIN in allowedRoles) → 403
  // ================================================================
  describe('SUPERADMIN on condominium-only routes', () => {
    it('should return 403 when SUPERADMIN accesses route with only condominium roles', async () => {
      const user = await createUser()
      await assignRole(user.id, superadminRoleId) // global
      const condoId = await createCondominium()

      // Route only allows ADMIN, ACCOUNTANT — no SUPERADMIN
      const app = buildApp('ADMIN', 'ACCOUNTANT')
      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${user.id}`,
          'x-condominium-id': condoId,
        },
      })

      // SUPERADMIN has no condominium role → 403
      expect(res.status).toBe(StatusCodes.FORBIDDEN)
    })
  })

  // ================================================================
  // 10. User with no roles at all → 403
  // ================================================================
  describe('user with no roles', () => {
    it('should return 403 for a user with no role assignments (condominium route)', async () => {
      const user = await createUser()
      const condoId = await createCondominium()

      const app = buildApp('ADMIN', 'USER')
      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${user.id}`,
          'x-condominium-id': condoId,
        },
      })

      expect(res.status).toBe(StatusCodes.FORBIDDEN)
    })

    it('should return 403 for SUPERADMIN-only route when user has no roles', async () => {
      const user = await createUser()

      const app = buildApp('SUPERADMIN')
      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${user.id}` },
      })

      expect(res.status).toBe(StatusCodes.FORBIDDEN)
    })
  })

  // ================================================================
  // 11. Multiple roles — user has multiple roles, first matching wins
  // ================================================================
  describe('user with multiple roles in same condominium', () => {
    it('should allow access if any of the user roles matches allowedRoles', async () => {
      const user = await createUser()
      const condoId = await createCondominium()
      // User has both USER and ADMIN roles in the same condo
      await assignRole(user.id, userRoleId, condoId)
      await assignRole(user.id, adminRoleId, condoId)

      const app = buildApp('ADMIN')
      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${user.id}`,
          'x-condominium-id': condoId,
        },
      })

      expect(res.status).toBe(StatusCodes.OK)
    })
  })
})
