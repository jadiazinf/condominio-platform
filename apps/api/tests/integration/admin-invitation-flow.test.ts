/**
 * Integration Tests: Admin Invitation Flow
 *
 * Tests the complete lifecycle of admin invitations:
 * 1. SUPERADMIN creates company + admin → invitation created
 * 2. Admin validates token (simulates clicking email link)
 * 3. Admin accepts invitation → user/company activated, member+subscription created
 *
 * Uses REAL database (test containers) with mocked auth (from preload.ts).
 *
 * NOTE: The accept endpoint uses the REAL isTokenValid middleware (not mocked via barrel).
 * It requires an Authorization: Bearer header. The mocked Firebase verifyIdToken
 * accepts any token and returns { uid: 'test-user-uid' }.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { startTestContainer, cleanDatabase } from '../setup/test-container'
import { createTestApp } from '../http/controllers/test-utils'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import {
  AdminInvitationsRepository,
  UsersRepository,
  ManagementCompaniesRepository,
  ManagementCompanyMembersRepository,
  UserRolesRepository,
  RolesRepository,
} from '@database/repositories'
import { AdminInvitationsController } from '@http/controllers/admin-invitations/admin-invitations.controller'

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

// Mock superadmin user ID (must match preload.ts mock)
const MOCK_SUPERADMIN_ID = '550e8400-e29b-41d4-a716-446655440000'

let db: TDrizzleClient
let app: Hono
let request: (path: string, options?: RequestInit) => Promise<Response>

// Repositories for direct DB verification
let invitationsRepo: AdminInvitationsRepository
let usersRepo: UsersRepository
let companiesRepo: ManagementCompaniesRepository
let membersRepo: ManagementCompanyMembersRepository
let userRolesRepo: UserRolesRepository
let rolesRepo: RolesRepository

beforeAll(async () => {
  // Clear Resend API key to force EmailService test bypass
  // (prevents hitting real Resend API during tests)
  delete process.env.RESEND_API_KEY
  // @ts-ignore
  delete Bun.env.RESEND_API_KEY

  db = await startTestContainer()
})

beforeEach(async () => {
  await cleanDatabase(db)

  // Insert the mock superadmin user (required as FK for created_by fields)
  await db.execute(sql`
    INSERT INTO users (id, firebase_uid, email, display_name, first_name, last_name, is_active, is_email_verified, preferred_language)
    VALUES (${MOCK_SUPERADMIN_ID}, 'firebase-uid-superadmin', 'superadmin@test.com', 'Superadmin User', 'Super', 'Admin', true, true, 'es')
  `)

  // Insert roles required for invitation services
  await db.execute(sql`
    INSERT INTO roles (name, description, is_system_role)
    VALUES ('USER', 'Standard user role', true)
    ON CONFLICT (name) DO NOTHING
  `)
  await db.execute(sql`
    INSERT INTO roles (name, description, is_system_role)
    VALUES ('ADMIN', 'Admin role', true)
    ON CONFLICT (name) DO NOTHING
  `)

  // Create repositories for direct DB verification
  invitationsRepo = new AdminInvitationsRepository(db)
  usersRepo = new UsersRepository(db)
  companiesRepo = new ManagementCompaniesRepository(db)
  membersRepo = new ManagementCompanyMembersRepository(db)
  userRolesRepo = new UserRolesRepository(db)
  rolesRepo = new RolesRepository(db)

  // Create controller with real repositories
  const controller = new AdminInvitationsController(
    db,
    invitationsRepo,
    usersRepo,
    companiesRepo,
    membersRepo,
    userRolesRepo,
    rolesRepo
  )

  // Create test app
  app = createTestApp()
  app.route('/platform/admin-invitations', controller.createRouter())

  request = async (path: string, options?: RequestInit) => app.request(path, options)
})

// ─────────────────────────────────────────────────────────────────────────────
// Test Data
// ─────────────────────────────────────────────────────────────────────────────

const validCompanyData = {
  name: 'Test Company S.A.',
  legalName: 'Test Company S.A. Legal',
  taxIdType: 'J' as const,
  taxIdNumber: 'J-12345678-9',
  email: 'company@test.com',
  phoneCountryCode: '+58',
  phone: '4121234567',
  website: null,
  address: 'Caracas, Venezuela',
  locationId: null,
  logoUrl: null,
  metadata: null,
}

const validAdminData = {
  email: 'admin@test-company.com',
  displayName: 'Admin User',
  phoneCountryCode: '+58',
  phoneNumber: '4121234567',
  photoUrl: null,
  firstName: 'Admin',
  lastName: 'Test',
  idDocumentType: null,
  idDocumentNumber: null,
  address: null,
  locationId: null,
  preferredLanguage: 'es' as const,
  preferredCurrencyId: null,
  lastLogin: null,
  metadata: null,
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function createInvitation(
  companyOverrides: Record<string, unknown> = {},
  adminOverrides: Record<string, unknown> = {}
) {
  const res = await request('/platform/admin-invitations/create-with-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company: { ...validCompanyData, ...companyOverrides },
      admin: { ...validAdminData, ...adminOverrides },
    }),
  })
  return res
}

/** Accept an invitation via the API. Sends a Bearer token for isTokenValid middleware. */
async function acceptInvitation(invitationToken: string) {
  return request(`/platform/admin-invitations/accept/${invitationToken}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-firebase-token',
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Admin Invitation Flow — Integration Tests', function () {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. Happy Path: Full Flow
  // ─────────────────────────────────────────────────────────────────────────

  describe('Happy path — full lifecycle', function () {
    it('creates company+admin, validates token, and accepts invitation', async function () {
      // ── Step 1: Create company with admin ──
      const createRes = await createInvitation()
      expect(createRes.status).toBe(201)

      const createJson = await createRes.json() as {
        data: {
          company: { id: string; name: string; isActive: boolean }
          admin: { id: string; email: string; isActive: boolean }
          invitation: { id: string; status: string; expiresAt: string }
          invitationToken: string
          emailSent: boolean
        }
      }

      const { company, admin, invitation, invitationToken } = createJson.data

      // Verify creation results
      expect(company.name).toBe('Test Company S.A.')
      expect(company.isActive).toBe(false)
      expect(admin.email).toBe('admin@test-company.com')
      expect(admin.isActive).toBe(false)
      expect(invitation.status).toBe('pending')
      expect(invitationToken).toBeDefined()
      expect(invitationToken.length).toBeGreaterThan(20)

      // Verify expiration is ~7 days from now
      const expiresAt = new Date(invitation.expiresAt)
      const now = new Date()
      const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBeGreaterThan(6)
      expect(diffDays).toBeLessThan(8)

      // ── Step 2: Validate token (simulates clicking email link) ──
      const validateRes = await request(
        `/platform/admin-invitations/validate/${invitationToken}`
      )
      expect(validateRes.status).toBe(200)

      const validateJson = await validateRes.json() as {
        data: {
          isValid: boolean
          isExpired: boolean
          user: { email: string; firstName: string; lastName: string }
          managementCompany: { name: string }
        }
      }

      expect(validateJson.data.isValid).toBe(true)
      expect(validateJson.data.isExpired).toBe(false)
      expect(validateJson.data.user.email).toBe('admin@test-company.com')
      expect(validateJson.data.user.firstName).toBe('Admin')
      expect(validateJson.data.user.lastName).toBe('Test')
      expect(validateJson.data.managementCompany.name).toBe('Test Company S.A.')

      // ── Step 3: Accept invitation ──
      // firebaseUid comes from the mocked verifyIdToken (returns 'test-user-uid' fallback)
      const acceptRes = await acceptInvitation(invitationToken)
      expect(acceptRes.status).toBe(200)

      const acceptJson = await acceptRes.json() as {
        data: {
          user: { id: string; isActive: boolean; isEmailVerified: boolean }
          managementCompany: { id: string; isActive: boolean }
        }
      }

      expect(acceptJson.data.user.isActive).toBe(true)
      expect(acceptJson.data.user.isEmailVerified).toBe(true)
      expect(acceptJson.data.managementCompany.isActive).toBe(true)

      // ── Step 4: Verify DB state directly ──
      // User
      const dbUser = await usersRepo.getById(admin.id)
      expect(dbUser).not.toBeNull()
      expect(dbUser!.isActive).toBe(true)
      expect(dbUser!.isEmailVerified).toBe(true)

      // Company
      const dbCompany = await companiesRepo.getById(company.id)
      expect(dbCompany).not.toBeNull()
      expect(dbCompany!.isActive).toBe(true)

      // Invitation
      const dbInvitation = await invitationsRepo.getById(invitation.id)
      expect(dbInvitation).not.toBeNull()
      expect(dbInvitation!.status).toBe('accepted')
      expect(dbInvitation!.acceptedAt).not.toBeNull()

      // Member
      const membersByCompany = await membersRepo.listByCompanyId(company.id)
      expect(membersByCompany.length).toBe(1)
      expect(membersByCompany[0]!.userId).toBe(admin.id)
      expect(membersByCompany[0]!.isPrimaryAdmin).toBe(true)
      expect(membersByCompany[0]!.roleName).toBe('admin')
      expect(membersByCompany[0]!.isActive).toBe(true)

      // User Role — verify the USER role was assigned in user_roles table
      const userRoles = await userRolesRepo.getByUserId(admin.id)
      expect(userRoles.length).toBeGreaterThanOrEqual(2) // USER + ADMIN(MC-scoped)
      const userRole = await rolesRepo.getByName('USER')
      expect(userRole).not.toBeNull()
      const matchingRole = userRoles.find(ur => ur.roleId === userRole!.id)
      expect(matchingRole).toBeDefined()
      expect(matchingRole!.isActive).toBe(true)
      expect(matchingRole!.condominiumId).toBeNull()

      // ADMIN MC-scoped role — verify it was created in user_roles
      const adminRole = await rolesRepo.getByName('ADMIN')
      expect(adminRole).not.toBeNull()
      const mcAdminRole = userRoles.find(ur => ur.roleId === adminRole!.id && ur.managementCompanyId === company.id)
      expect(mcAdminRole).toBeDefined()
      expect(mcAdminRole!.isActive).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Token already accepted (not reusable)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Token already accepted', function () {
    it('cannot validate an already-accepted token as valid', async function () {
      // Create and accept invitation
      const createRes = await createInvitation()
      const createJson = await createRes.json() as { data: { invitationToken: string } }
      const { invitationToken } = createJson.data

      // Accept
      await acceptInvitation(invitationToken)

      // Validate again — should return isValid: false
      const validateRes = await request(
        `/platform/admin-invitations/validate/${invitationToken}`
      )
      expect(validateRes.status).toBe(200)

      const validateJson = await validateRes.json() as {
        data: { isValid: boolean; isExpired: boolean }
      }
      expect(validateJson.data.isValid).toBe(false)
    })

    it('cannot accept an already-accepted token again', async function () {
      const createRes = await createInvitation()
      const createJson = await createRes.json() as { data: { invitationToken: string } }
      const { invitationToken } = createJson.data

      // Accept first time
      const firstAccept = await acceptInvitation(invitationToken)
      expect(firstAccept.status).toBe(200)

      // Accept second time — should fail
      const secondAccept = await acceptInvitation(invitationToken)
      expect(secondAccept.status).toBeGreaterThanOrEqual(400)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Token not found
  // ─────────────────────────────────────────────────────────────────────────

  describe('Token not found', function () {
    it('returns 404 for nonexistent token', async function () {
      const res = await request(
        '/platform/admin-invitations/validate/this-token-does-not-exist-in-db'
      )
      expect(res.status).toBe(404)
    })

    it('returns error for accepting nonexistent token', async function () {
      const res = await acceptInvitation('this-token-does-not-exist-in-db')
      expect(res.status).toBe(404)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Token expired
  // ─────────────────────────────────────────────────────────────────────────

  describe('Expired token', function () {
    it('validates as expired', async function () {
      const createRes = await createInvitation({}, {
        email: 'expired-admin@test.com',
      })
      expect(createRes.status).toBe(201)

      const createJson = await createRes.json() as {
        data: { invitation: { id: string }; invitationToken: string }
      }

      // Manually expire the invitation in DB
      await invitationsRepo.update(createJson.data.invitation.id, {
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      })

      // Validate — should show expired
      const validateRes = await request(
        `/platform/admin-invitations/validate/${createJson.data.invitationToken}`
      )
      expect(validateRes.status).toBe(200)

      const validateJson = await validateRes.json() as {
        data: { isValid: boolean; isExpired: boolean }
      }
      expect(validateJson.data.isExpired).toBe(true)
      expect(validateJson.data.isValid).toBe(false)
    })

    it('cannot accept expired token', async function () {
      const createRes = await createInvitation({}, {
        email: 'expired-accept@test.com',
      })
      const createJson = await createRes.json() as {
        data: { invitation: { id: string }; invitationToken: string }
      }

      // Manually expire
      await invitationsRepo.update(createJson.data.invitation.id, {
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      })

      // Accept — should fail
      const acceptRes = await acceptInvitation(createJson.data.invitationToken)
      expect(acceptRes.status).toBeGreaterThanOrEqual(400)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Cancelled invitation
  // ─────────────────────────────────────────────────────────────────────────

  describe('Cancelled invitation', function () {
    it('cannot accept cancelled invitation', async function () {
      const createRes = await createInvitation({}, {
        email: 'cancelled-admin@test.com',
      })
      expect(createRes.status).toBe(201)
      const createJson = await createRes.json() as {
        data: { invitation: { id: string }; invitationToken: string }
      }

      // Cancel
      const cancelRes = await request(
        `/platform/admin-invitations/${createJson.data.invitation.id}`,
        { method: 'DELETE' }
      )
      expect(cancelRes.status).toBe(200)

      // Validate — should show invalid
      const validateRes = await request(
        `/platform/admin-invitations/validate/${createJson.data.invitationToken}`
      )
      expect(validateRes.status).toBe(200)
      const validateJson = await validateRes.json() as {
        data: { isValid: boolean }
      }
      expect(validateJson.data.isValid).toBe(false)

      // Accept — should fail
      const acceptRes = await acceptInvitation(createJson.data.invitationToken)
      expect(acceptRes.status).toBeGreaterThanOrEqual(400)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Duplicate invitation
  // ─────────────────────────────────────────────────────────────────────────

  describe('Duplicate email', function () {
    it('cannot create two invitations for the same email', async function () {
      // First invitation
      const firstRes = await createInvitation()
      expect(firstRes.status).toBe(201)

      // Second invitation with same email
      const secondRes = await createInvitation(
        { name: 'Another Company' },
        { email: 'admin@test-company.com' } // Same email
      )
      // Should be conflict since user already exists
      expect(secondRes.status).toBeGreaterThanOrEqual(400)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Resend email
  // ─────────────────────────────────────────────────────────────────────────

  describe('Resend email', function () {
    it('regenerates token and keeps invitation pending', async function () {
      const createRes = await createInvitation({}, {
        email: 'resend-admin@test.com',
      })
      expect(createRes.status).toBe(201)
      const createJson = await createRes.json() as {
        data: { invitation: { id: string }; invitationToken: string }
      }
      const originalToken = createJson.data.invitationToken

      // Resend email
      const resendRes = await request(
        `/platform/admin-invitations/${createJson.data.invitation.id}/resend-email`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      )
      expect(resendRes.status).toBe(200)

      // Old token should no longer work
      const oldValidateRes = await request(
        `/platform/admin-invitations/validate/${originalToken}`
      )
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
  // 8. Token URL encoding
  // ─────────────────────────────────────────────────────────────────────────

  describe('Token encoding', function () {
    it('base64url tokens work correctly in URL path params', async function () {
      const createRes = await createInvitation({}, {
        email: 'encoding-admin@test.com',
      })
      expect(createRes.status).toBe(201)
      const createJson = await createRes.json() as {
        data: { invitationToken: string }
      }
      const token = createJson.data.invitationToken

      // Verify token is base64url (no +, /, or =)
      expect(token).not.toContain('+')
      expect(token).not.toContain('/')

      // URL-encode the token (should be a no-op for base64url)
      const encoded = encodeURIComponent(token)

      // Validate with encoded token
      const validateRes = await request(
        `/platform/admin-invitations/validate/${encoded}`
      )
      expect(validateRes.status).toBe(200)
      const validateJson = await validateRes.json() as {
        data: { isValid: boolean }
      }
      expect(validateJson.data.isValid).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 9. Create with existing admin
  // ─────────────────────────────────────────────────────────────────────────

  describe('Create with existing admin', function () {
    it('creates company with existing active user as admin', async function () {
      // First create a user via the invitation flow
      const createRes = await createInvitation({}, {
        email: 'existing-admin@test.com',
      })
      expect(createRes.status).toBe(201)
      const createJson = await createRes.json() as {
        data: { admin: { id: string }; invitationToken: string }
      }

      // Accept to make user active
      const acceptRes = await acceptInvitation(createJson.data.invitationToken)
      expect(acceptRes.status).toBe(200)

      // Now create a second company with this existing user
      const secondRes = await request(
        '/platform/admin-invitations/create-with-existing-admin',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company: {
              ...validCompanyData,
              name: 'Second Company',
              email: 'second@test.com',
            },
            existingUserId: createJson.data.admin.id,
          }),
        }
      )
      expect(secondRes.status).toBe(201)

      const secondJson = await secondRes.json() as {
        data: {
          company: { name: string; isActive: boolean }
          admin: { id: string; isActive: boolean }
          member: { isPrimaryAdmin: boolean }
        }
      }

      expect(secondJson.data.company.name).toBe('Second Company')
      expect(secondJson.data.company.isActive).toBe(true)
      expect(secondJson.data.admin.isActive).toBe(true)
      expect(secondJson.data.member.isPrimaryAdmin).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 10. Validation errors
  // ─────────────────────────────────────────────────────────────────────────

  describe('Validation errors', function () {
    it('rejects create-with-admin with missing company name', async function () {
      const res = await request('/platform/admin-invitations/create-with-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: { ...validCompanyData, name: '' },
          admin: validAdminData,
        }),
      })
      expect(res.status).toBe(422)
    })

    it('rejects create-with-admin with invalid admin email', async function () {
      const res = await request('/platform/admin-invitations/create-with-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: validCompanyData,
          admin: { ...validAdminData, email: 'not-an-email' },
        }),
      })
      expect(res.status).toBe(422)
    })

    it('rejects empty token param', async function () {
      const res = await request('/platform/admin-invitations/validate/')
      // Should be 404 (no matching route) or 422 (validation)
      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })
})
