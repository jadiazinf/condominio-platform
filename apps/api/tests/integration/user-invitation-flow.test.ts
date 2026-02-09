/**
 * Integration Tests: User Invitation Flow
 *
 * Tests the complete lifecycle of user invitations:
 * 1. ADMIN creates user invitation → inactive user + inactive role + pending invitation
 * 2. User validates token (simulates clicking email link)
 * 3. User accepts invitation → user activated, role activated, invitation accepted
 *
 * Uses REAL database (test containers) with mocked auth (from preload.ts).
 *
 * NOTE: The accept endpoint manually verifies the Firebase token via admin.auth().verifyIdToken().
 * The mocked Firebase verifyIdToken accepts any token and returns { uid: 'test-user-uid' }.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { startTestContainer, cleanDatabase } from '../setup/test-container'
import { createTestApp } from '../http/controllers/test-utils'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import {
  UserInvitationsRepository,
  UsersRepository,
  UserRolesRepository,
  UserPermissionsRepository,
  RolesRepository,
  CondominiumsRepository,
  PermissionsRepository,
} from '@database/repositories'
import { UserInvitationsController } from '@http/controllers/user-invitations/user-invitations.controller'

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

// Mock admin user ID (must match preload.ts mock)
const MOCK_ADMIN_ID = '550e8400-e29b-41d4-a716-446655440000'

let db: TDrizzleClient
let app: Hono
let request: (path: string, options?: RequestInit) => Promise<Response>

// Repositories for direct DB verification
let invitationsRepo: UserInvitationsRepository
let usersRepo: UsersRepository
let userRolesRepo: UserRolesRepository
let rolesRepo: RolesRepository
let condominiumsRepo: CondominiumsRepository

// Pre-created test data IDs
let testRoleId: string
let testCondominiumId: string

beforeAll(async () => {
  // Clear Resend API key to force EmailService test bypass
  delete process.env.RESEND_API_KEY
  // @ts-ignore
  delete Bun.env.RESEND_API_KEY

  db = await startTestContainer()
})

beforeEach(async () => {
  await cleanDatabase(db)

  // Insert the mock admin user (required as FK for created_by fields)
  await db.execute(sql`
    INSERT INTO users (id, firebase_uid, email, display_name, first_name, last_name, is_active, is_email_verified, preferred_language)
    VALUES (${MOCK_ADMIN_ID}, 'firebase-uid-superadmin', 'admin@test.com', 'Admin User', 'Admin', 'User', true, true, 'es')
  `)

  // Insert a role (required for user invitations)
  const roleResult = await db.execute(sql`
    INSERT INTO roles (name, description, is_system_role)
    VALUES ('RESIDENT', 'Resident role', false)
    RETURNING id
  `) as unknown as { id: string }[]
  testRoleId = roleResult[0]!.id

  // Insert a condominium (optional for user invitations)
  const condoResult = await db.execute(sql`
    INSERT INTO condominiums (name, is_active)
    VALUES ('Test Condominium', true)
    RETURNING id
  `) as unknown as { id: string }[]
  testCondominiumId = condoResult[0]!.id

  // Create repositories
  invitationsRepo = new UserInvitationsRepository(db)
  usersRepo = new UsersRepository(db)
  userRolesRepo = new UserRolesRepository(db)
  const userPermissionsRepo = new UserPermissionsRepository(db)
  rolesRepo = new RolesRepository(db)
  condominiumsRepo = new CondominiumsRepository(db)
  const permissionsRepo = new PermissionsRepository(db)

  // Create controller with real repositories
  const controller = new UserInvitationsController(
    db,
    invitationsRepo,
    usersRepo,
    userRolesRepo,
    userPermissionsRepo,
    rolesRepo,
    condominiumsRepo,
    permissionsRepo
  )

  // Create test app
  app = createTestApp()
  app.route('/condominium/user-invitations', controller.createRouter())

  request = async (path: string, options?: RequestInit) => app.request(path, options)
})

afterAll(async () => {
  // Test container cleanup handled by global teardown
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function createInvitation(
  overrides: Record<string, unknown> = {}
) {
  return request('/condominium/user-invitations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer placeholder-token:firebase-uid-superadmin',
    },
    body: JSON.stringify({
      email: 'invited-user@test.com',
      firstName: 'Invited',
      lastName: 'User',
      roleId: testRoleId,
      condominiumId: testCondominiumId,
      ...overrides,
    }),
  })
}

async function acceptInvitation(invitationToken: string) {
  return request(`/condominium/user-invitations/accept/${invitationToken}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-firebase-token',
    },
  })
}

async function validateToken(token: string) {
  return request(`/condominium/user-invitations/validate/${token}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('User Invitation Flow — Integration Tests', function () {

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Happy path: Full lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  describe('Full lifecycle', function () {
    it('creates invitation, validates, and accepts successfully', async function () {
      // Step 1: Create invitation
      const createRes = await createInvitation()
      expect(createRes.status).toBe(201)
      const createJson = await createRes.json() as {
        data: {
          user: { id: string; email: string; isActive: boolean }
          invitation: { id: string; status: string }
          userRole: { id: string; isActive: boolean }
          invitationToken: string
          emailSent: boolean
        }
      }

      // Verify user created as inactive
      expect(createJson.data.user.email).toBe('invited-user@test.com')
      expect(createJson.data.user.isActive).toBe(false)

      // Verify invitation is pending
      expect(createJson.data.invitation.status).toBe('pending')

      // Verify userRole is inactive
      expect(createJson.data.userRole.isActive).toBe(false)

      const invitationToken = createJson.data.invitationToken
      expect(invitationToken).toBeTruthy()

      // Step 2: Validate token
      const validateRes = await validateToken(invitationToken)
      expect(validateRes.status).toBe(200)
      const validateJson = await validateRes.json() as {
        data: {
          isValid: boolean
          isExpired: boolean
          user: { email: string }
          condominium: { id: string; name: string } | null
          role: { id: string; name: string }
        }
      }

      expect(validateJson.data.isValid).toBe(true)
      expect(validateJson.data.isExpired).toBe(false)
      expect(validateJson.data.user.email).toBe('invited-user@test.com')
      expect(validateJson.data.condominium).not.toBeNull()
      expect(validateJson.data.condominium!.name).toBe('Test Condominium')
      expect(validateJson.data.role.name).toBe('RESIDENT')

      // Step 3: Accept invitation
      const acceptRes = await acceptInvitation(invitationToken)
      expect(acceptRes.status).toBe(200)
      const acceptJson = await acceptRes.json() as {
        data: {
          user: { id: string; isActive: boolean }
          invitation: { status: string; acceptedAt: string }
        }
      }

      // Verify user is now active
      expect(acceptJson.data.user.isActive).toBe(true)

      // Verify invitation is accepted
      expect(acceptJson.data.invitation.status).toBe('accepted')
      expect(acceptJson.data.invitation.acceptedAt).toBeTruthy()

      // Verify DB state: user is active
      const dbUser = await usersRepo.getById(createJson.data.user.id)
      expect(dbUser).not.toBeNull()
      expect(dbUser!.isActive).toBe(true)

      // Verify DB state: user role is active
      const dbUserRoles = await userRolesRepo.getByUserAndRole(
        createJson.data.user.id,
        testRoleId,
        testCondominiumId
      )
      expect(dbUserRoles.length).toBeGreaterThan(0)
      expect(dbUserRoles[0]!.isActive).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Accept already accepted invitation
  // ─────────────────────────────────────────────────────────────────────────

  describe('Already accepted', function () {
    it('returns error when trying to accept an already accepted invitation', async function () {
      // Create and accept
      const createRes = await createInvitation()
      expect(createRes.status).toBe(201)
      const createJson = await createRes.json() as {
        data: { invitationToken: string }
      }

      const firstAccept = await acceptInvitation(createJson.data.invitationToken)
      expect(firstAccept.status).toBe(200)

      // Try to accept again
      const secondAccept = await acceptInvitation(createJson.data.invitationToken)
      expect(secondAccept.status).toBeGreaterThanOrEqual(400)
    })

    it('returns correct message for already accepted invitation via validate', async function () {
      // Create and accept
      const createRes = await createInvitation()
      expect(createRes.status).toBe(201)
      const createJson = await createRes.json() as {
        data: { invitationToken: string }
      }

      await acceptInvitation(createJson.data.invitationToken)

      // Validate the token — should return isValid=false
      const validateRes = await validateToken(createJson.data.invitationToken)
      expect(validateRes.status).toBe(200)
      const validateJson = await validateRes.json() as {
        data: { isValid: boolean }
      }
      expect(validateJson.data.isValid).toBe(false)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Token not found
  // ─────────────────────────────────────────────────────────────────────────

  describe('Token not found', function () {
    it('returns 404 for validate with non-existent token', async function () {
      const res = await validateToken('nonexistent-token-abc123')
      expect(res.status).toBe(404)
    })

    it('returns error for accept with non-existent token', async function () {
      const res = await acceptInvitation('nonexistent-token-abc123')
      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Expired invitation
  // ─────────────────────────────────────────────────────────────────────────

  describe('Expired invitation', function () {
    it('validates as expired and rejects accept', async function () {
      // Create invitation
      const createRes = await createInvitation()
      expect(createRes.status).toBe(201)
      const createJson = await createRes.json() as {
        data: { invitation: { id: string }; invitationToken: string }
      }

      // Manually expire the invitation
      await db.execute(sql`
        UPDATE user_invitations SET expires_at = NOW() - INTERVAL '1 day'
        WHERE id = ${createJson.data.invitation.id}
      `)

      // Validate should show expired
      const validateRes = await validateToken(createJson.data.invitationToken)
      expect(validateRes.status).toBe(200)
      const validateJson = await validateRes.json() as {
        data: { isValid: boolean; isExpired: boolean }
      }
      expect(validateJson.data.isValid).toBe(false)
      expect(validateJson.data.isExpired).toBe(true)

      // Accept should fail
      const acceptRes = await acceptInvitation(createJson.data.invitationToken)
      expect(acceptRes.status).toBeGreaterThanOrEqual(400)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Cancelled invitation
  // ─────────────────────────────────────────────────────────────────────────

  describe('Cancelled invitation', function () {
    it('cancelled invitation cannot be accepted', async function () {
      // Create invitation
      const createRes = await createInvitation()
      expect(createRes.status).toBe(201)
      const createJson = await createRes.json() as {
        data: { invitation: { id: string }; invitationToken: string }
      }

      // Cancel it
      const cancelRes = await request(
        `/condominium/user-invitations/${createJson.data.invitation.id}`,
        { method: 'DELETE', headers: { 'Content-Type': 'application/json' } }
      )
      expect(cancelRes.status).toBe(200)

      // Accept should fail
      const acceptRes = await acceptInvitation(createJson.data.invitationToken)
      expect(acceptRes.status).toBeGreaterThanOrEqual(400)
    })

    it('cancel returns the cancelled invitation', async function () {
      const createRes = await createInvitation()
      expect(createRes.status).toBe(201)
      const createJson = await createRes.json() as {
        data: { invitation: { id: string } }
      }

      const cancelRes = await request(
        `/condominium/user-invitations/${createJson.data.invitation.id}`,
        { method: 'DELETE', headers: { 'Content-Type': 'application/json' } }
      )
      expect(cancelRes.status).toBe(200)
      const cancelJson = await cancelRes.json() as {
        data: { id: string; status: string }
      }
      expect(cancelJson.data.status).toBe('cancelled')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Duplicate email
  // ─────────────────────────────────────────────────────────────────────────

  describe('Duplicate email', function () {
    it('rejects invitation for email with existing active user', async function () {
      // Create and accept a first invitation to make the user active
      const firstRes = await createInvitation({ email: 'dupe@test.com' })
      expect(firstRes.status).toBe(201)
      const firstJson = await firstRes.json() as {
        data: { invitationToken: string }
      }
      await acceptInvitation(firstJson.data.invitationToken)

      // Try to create another invitation with the same email
      const secondRes = await createInvitation({ email: 'dupe@test.com' })
      // Should conflict because user is now active
      expect(secondRes.status).toBeGreaterThanOrEqual(400)
    })

    it('rejects invitation for email with pending invitation', async function () {
      // Create first invitation (user inactive, pending)
      const firstRes = await createInvitation({
        email: 'pending-dupe@test.com',
        condominiumId: testCondominiumId,
      })
      expect(firstRes.status).toBe(201)

      // Create second invitation with same email and same condominium
      const secondRes = await createInvitation({
        email: 'pending-dupe@test.com',
        condominiumId: testCondominiumId,
      })
      // Should conflict because there's already a pending invitation
      expect(secondRes.status).toBeGreaterThanOrEqual(400)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Resend email
  // ─────────────────────────────────────────────────────────────────────────

  describe('Resend email', function () {
    it('regenerates token and keeps invitation pending', async function () {
      const createRes = await createInvitation({ email: 'resend-user@test.com' })
      expect(createRes.status).toBe(201)
      const createJson = await createRes.json() as {
        data: { invitation: { id: string }; invitationToken: string }
      }
      const originalToken = createJson.data.invitationToken

      // Resend email
      const resendRes = await request(
        `/condominium/user-invitations/${createJson.data.invitation.id}/resend-email`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      )
      expect(resendRes.status).toBe(200)

      // Old token should no longer work
      const oldValidateRes = await validateToken(originalToken)
      expect(oldValidateRes.status).toBe(404)

      // Invitation should still be pending
      const dbInvitation = await invitationsRepo.getById(createJson.data.invitation.id)
      expect(dbInvitation).not.toBeNull()
      expect(dbInvitation!.status).toBe('pending')
      // Token changed
      expect(dbInvitation!.token).not.toBe(originalToken)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Invitation without condominium (global user)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Global user (no condominium)', function () {
    it('creates and accepts invitation without condominiumId', async function () {
      // Create invitation without condominium
      const createRes = await createInvitation({
        email: 'global-user@test.com',
        condominiumId: null,
      })
      expect(createRes.status).toBe(201)
      const createJson = await createRes.json() as {
        data: {
          user: { id: string }
          invitation: { condominiumId: string | null }
          invitationToken: string
        }
      }

      expect(createJson.data.invitation.condominiumId).toBeNull()

      // Validate — condominium should be null
      const validateRes = await validateToken(createJson.data.invitationToken)
      expect(validateRes.status).toBe(200)
      const validateJson = await validateRes.json() as {
        data: { isValid: boolean; condominium: unknown }
      }
      expect(validateJson.data.isValid).toBe(true)
      expect(validateJson.data.condominium).toBeNull()

      // Accept
      const acceptRes = await acceptInvitation(createJson.data.invitationToken)
      expect(acceptRes.status).toBe(200)
      const acceptJson = await acceptRes.json() as {
        data: { user: { isActive: boolean } }
      }
      expect(acceptJson.data.user.isActive).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 9. Validation errors
  // ─────────────────────────────────────────────────────────────────────────

  describe('Validation errors', function () {
    it('rejects creation with missing email', async function () {
      const res = await request('/condominium/user-invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: testRoleId,
          condominiumId: testCondominiumId,
        }),
      })
      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('rejects creation with invalid email', async function () {
      const res = await createInvitation({ email: 'not-an-email' })
      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('rejects creation with missing roleId', async function () {
      const res = await request('/condominium/user-invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@test.com',
          condominiumId: testCondominiumId,
        }),
      })
      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('rejects creation with non-existent roleId', async function () {
      const res = await createInvitation({
        roleId: '00000000-0000-0000-0000-000000000099',
      })
      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('rejects creation with non-existent condominiumId', async function () {
      const res = await createInvitation({
        condominiumId: '00000000-0000-0000-0000-000000000099',
      })
      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 10. Accept without Authorization header
  // ─────────────────────────────────────────────────────────────────────────

  describe('Accept without auth', function () {
    it('rejects accept without Authorization header', async function () {
      const createRes = await createInvitation({ email: 'noauth@test.com' })
      expect(createRes.status).toBe(201)
      const createJson = await createRes.json() as {
        data: { invitationToken: string }
      }

      // Accept WITHOUT Authorization header
      const acceptRes = await request(
        `/condominium/user-invitations/accept/${createJson.data.invitationToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      )
      expect(acceptRes.status).toBe(401)
    })
  })
})
