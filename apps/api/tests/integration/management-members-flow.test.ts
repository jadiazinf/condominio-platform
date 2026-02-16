/**
 * Integration Tests: Management Company Members Flow
 *
 * Tests the ManagementCompanyMembersController end-to-end against a real
 * PostgreSQL database (test container).
 *
 * Covers:
 *  - POST   /platform/management-companies/:companyId/members           (add member)
 *  - GET    /platform/management-companies/:companyId/members           (list members)
 *  - GET    /platform/management-companies/:companyId/primary-admin     (get primary admin)
 *  - PATCH  /platform/management-company-members/:id                    (update member)
 *  - PATCH  /platform/management-company-members/:id/permissions        (update permissions)
 *  - DELETE /platform/management-company-members/:id                    (remove / soft delete)
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { startTestContainer, cleanDatabase } from '../setup/test-container'
import { createTestApp } from '../http/controllers/test-utils'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import {
  ManagementCompanyMembersRepository,
  UserRolesRepository,
  RolesRepository,
} from '@database/repositories'
import { ManagementCompanyMembersController } from '@http/controllers/management-company-members/members.controller'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const SECOND_USER_ID = '660e8400-e29b-41d4-a716-446655440001'

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

let db: TDrizzleClient
let app: Hono
let membersRepo: ManagementCompanyMembersRepository
let companyId: string
let request: (path: string, options?: RequestInit) => Promise<Response>

beforeAll(async () => {
  db = await startTestContainer()
})

beforeEach(async () => {
  await cleanDatabase(db)

  // Insert two test users
  await db.execute(sql`
    INSERT INTO users (id, firebase_uid, email, display_name, first_name, last_name, is_active, is_email_verified, preferred_language)
    VALUES (${MOCK_USER_ID}, 'firebase-uid-1', 'admin@test.com', 'Test Admin', 'Test', 'Admin', true, true, 'es')
  `)
  await db.execute(sql`
    INSERT INTO users (id, firebase_uid, email, display_name, first_name, last_name, is_active, is_email_verified, preferred_language)
    VALUES (${SECOND_USER_ID}, 'firebase-uid-2', 'member@test.com', 'Test Member', 'Member', 'User', true, true, 'es')
  `)

  // Insert a management company and capture its id
  const companyResult = await db.execute(sql`
    INSERT INTO management_companies (name, created_by)
    VALUES ('Test Company', ${MOCK_USER_ID})
    RETURNING id
  `) as unknown as { id: string }[]
  companyId = companyResult[0]!.id

  // Insert roles required by AddMemberService
  await db.execute(sql`
    INSERT INTO roles (name, description, is_system_role)
    VALUES ('ADMIN', 'Admin role', true),
           ('ACCOUNTANT', 'Accountant role', true),
           ('SUPPORT', 'Support role', true),
           ('VIEWER', 'Viewer role', true)
    ON CONFLICT (name) DO NOTHING
  `)

  // Create repository and controller
  membersRepo = new ManagementCompanyMembersRepository(db)
  const userRolesRepo = new UserRolesRepository(db)
  const rolesRepo = new RolesRepository(db)
  const controller = new ManagementCompanyMembersController(membersRepo, userRolesRepo, rolesRepo)

  // Mount with empty prefix since routes already have full paths
  app = createTestApp()
  app.route('', controller.createRouter())

  request = async (path: string, options?: RequestInit) => app.request(path, options)
})

afterAll(async () => {
  // Cleanup handled by global teardown in preload.ts
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function membersUrl(cId: string = companyId): string {
  return `/platform/management-companies/${cId}/members`
}

function primaryAdminUrl(cId: string = companyId): string {
  return `/platform/management-companies/${cId}/primary-admin`
}

function memberUrl(memberId: string): string {
  return `/platform/management-company-members/${memberId}`
}

function permissionsUrl(memberId: string): string {
  return `/platform/management-company-members/${memberId}/permissions`
}

async function addMember(body: Record<string, unknown>, cId?: string): Promise<Response> {
  return request(membersUrl(cId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function addPrimaryAdmin(): Promise<{ id: string }> {
  const res = await addMember({
    userId: MOCK_USER_ID,
    role: 'admin',
    isPrimary: true,
    invitedBy: MOCK_USER_ID,
  })
  const json = await res.json() as { data: { id: string } }
  return json.data
}

async function addRegularMember(): Promise<{ id: string }> {
  const res = await addMember({
    userId: SECOND_USER_ID,
    role: 'accountant',
    invitedBy: MOCK_USER_ID,
  })
  const json = await res.json() as { data: { id: string } }
  return json.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ManagementCompanyMembersController — Integration', function () {

  // ════════════════════════════════════════════════════════════════════════════
  // POST /platform/management-companies/:companyId/members
  // ════════════════════════════════════════════════════════════════════════════

  describe('POST — Add Member', function () {

    it('should add a primary admin member with 201', async function () {
      const res = await addMember({
        userId: MOCK_USER_ID,
        role: 'admin',
        isPrimary: true,
        invitedBy: MOCK_USER_ID,
      })

      expect(res.status).toBe(201)
      const json = await res.json() as { data: Record<string, unknown> }
      expect(json.data.userId).toBe(MOCK_USER_ID)
      expect(json.data.roleName).toBe('admin')
      expect(json.data.isPrimaryAdmin).toBe(true)
      expect(json.data.isActive).toBe(true)
      expect(json.data.managementCompanyId).toBe(companyId)
    })

    it('should add a regular member (non-primary) with 201', async function () {
      const res = await addMember({
        userId: SECOND_USER_ID,
        role: 'accountant',
        invitedBy: MOCK_USER_ID,
      })

      expect(res.status).toBe(201)
      const json = await res.json() as { data: Record<string, unknown> }
      expect(json.data.userId).toBe(SECOND_USER_ID)
      expect(json.data.roleName).toBe('accountant')
      expect(json.data.isPrimaryAdmin).toBe(false)
      expect(json.data.isActive).toBe(true)
    })

    it('should assign default permissions based on role when none provided', async function () {
      const res = await addMember({
        userId: SECOND_USER_ID,
        role: 'viewer',
      })

      expect(res.status).toBe(201)
      const json = await res.json() as { data: { permissions: Record<string, boolean> } }
      // Viewer gets limited permissions by default (from AddMemberService)
      expect(json.data.permissions.can_change_subscription).toBe(false)
      expect(json.data.permissions.can_manage_members).toBe(false)
      expect(json.data.permissions.can_create_tickets).toBe(true)
      expect(json.data.permissions.can_view_invoices).toBe(false)
    })

    it('should use explicit permissions when provided', async function () {
      const customPerms = {
        can_change_subscription: true,
        can_manage_members: true,
        can_create_tickets: false,
        can_view_invoices: true,
      }
      const res = await addMember({
        userId: SECOND_USER_ID,
        role: 'viewer',
        permissions: customPerms,
      })

      expect(res.status).toBe(201)
      const json = await res.json() as { data: { permissions: Record<string, boolean> } }
      expect(json.data.permissions).toEqual(customPerms)
    })

    it('should reject adding a second primary admin (conflict)', async function () {
      // First primary admin
      await addMember({
        userId: MOCK_USER_ID,
        role: 'admin',
        isPrimary: true,
      })

      // Attempt second primary admin
      const res = await addMember({
        userId: SECOND_USER_ID,
        role: 'admin',
        isPrimary: true,
      })

      expect(res.status).toBe(400)
      const json = await res.json() as { error: string }
      expect(json.error).toContain('primary admin')
    })

    it('should return 422 when userId is missing', async function () {
      const res = await addMember({
        role: 'admin',
      })

      expect(res.status).toBe(422)
    })

    it('should return 422 when role is missing', async function () {
      const res = await addMember({
        userId: SECOND_USER_ID,
      })

      expect(res.status).toBe(422)
    })

    it('should return 422 when role is invalid', async function () {
      const res = await addMember({
        userId: SECOND_USER_ID,
        role: 'invalid_role',
      })

      expect(res.status).toBe(422)
    })

    it('should return 422 when userId is not a valid UUID', async function () {
      const res = await addMember({
        userId: 'not-a-uuid',
        role: 'admin',
      })

      expect(res.status).toBe(422)
    })

    it('should support all four valid roles', async function () {
      const roles = ['admin', 'accountant', 'support', 'viewer'] as const

      // We can only add one user per company (unique constraint), so we create
      // separate companies for each role test.
      for (const role of roles) {
        // Clean and create fresh data for each role
        await cleanDatabase(db)
        await db.execute(sql`
          INSERT INTO users (id, firebase_uid, email, display_name, first_name, last_name, is_active, is_email_verified, preferred_language)
          VALUES (${MOCK_USER_ID}, 'firebase-uid-1', 'admin@test.com', 'Test Admin', 'Test', 'Admin', true, true, 'es')
        `)
        await db.execute(sql`
          INSERT INTO users (id, firebase_uid, email, display_name, first_name, last_name, is_active, is_email_verified, preferred_language)
          VALUES (${SECOND_USER_ID}, 'firebase-uid-2', 'member@test.com', 'Test Member', 'Member', 'User', true, true, 'es')
        `)
        await db.execute(sql`
          INSERT INTO roles (name, description, is_system_role)
          VALUES ('ADMIN', 'Admin role', true),
                 ('ACCOUNTANT', 'Accountant role', true),
                 ('SUPPORT', 'Support role', true),
                 ('VIEWER', 'Viewer role', true)
          ON CONFLICT (name) DO NOTHING
        `)
        const cRes = await db.execute(sql`
          INSERT INTO management_companies (name, created_by)
          VALUES ('Role Test Company', ${MOCK_USER_ID})
          RETURNING id
        `) as unknown as { id: string }[]
        const cId = cRes[0]!.id

        const res = await addMember({ userId: SECOND_USER_ID, role }, cId)
        expect(res.status).toBe(201)
        const json = await res.json() as { data: { roleName: string } }
        expect(json.data.roleName).toBe(role)
      }
    })
  })

  // ════════════════════════════════════════════════════════════════════════════
  // GET /platform/management-companies/:companyId/members
  // ════════════════════════════════════════════════════════════════════════════

  describe('GET — List Members', function () {

    it('should return empty list when no members exist', async function () {
      const res = await request(membersUrl())
      expect(res.status).toBe(200)
      const json = await res.json() as { data: unknown[]; pagination: Record<string, number> }
      expect(json.data).toHaveLength(0)
      expect(json.pagination.total).toBe(0)
    })

    it('should return added members with user details', async function () {
      await addPrimaryAdmin()
      await addRegularMember()

      const res = await request(membersUrl())
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { user: Record<string, unknown> }[]; pagination: Record<string, number> }
      expect(json.data).toHaveLength(2)
      expect(json.pagination.total).toBe(2)

      // Verify user info is joined
      const userEmails = json.data.map((m) => m.user?.email)
      expect(userEmails).toContain('admin@test.com')
      expect(userEmails).toContain('member@test.com')
    })

    it('should sort primary admin first', async function () {
      // Add regular member first, then primary admin
      await addRegularMember()
      await addPrimaryAdmin()

      const res = await request(membersUrl())
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { isPrimaryAdmin: boolean }[] }
      expect(json.data[0]!.isPrimaryAdmin).toBe(true)
    })

    it('should support pagination', async function () {
      // Add two members
      await addPrimaryAdmin()
      await addRegularMember()

      // Request page 1, limit 1
      const res = await request(`${membersUrl()}?page=1&limit=1`)
      expect(res.status).toBe(200)
      const json = await res.json() as { data: unknown[]; pagination: { total: number; totalPages: number; page: number; limit: number } }
      expect(json.data).toHaveLength(1)
      expect(json.pagination.total).toBe(2)
      expect(json.pagination.totalPages).toBe(2)
    })

    it('should filter by roleName', async function () {
      await addPrimaryAdmin()
      await addRegularMember()

      const res = await request(`${membersUrl()}?roleName=accountant`)
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { roleName: string }[] }
      expect(json.data).toHaveLength(1)
      expect(json.data[0]!.roleName).toBe('accountant')
    })

    it('should filter by search (user name)', async function () {
      await addPrimaryAdmin()
      await addRegularMember()

      const res = await request(`${membersUrl()}?search=Member`)
      expect(res.status).toBe(200)
      const json = await res.json() as { data: unknown[] }
      expect(json.data).toHaveLength(1)
    })

    it('should return 400 for invalid companyId UUID', async function () {
      const res = await request('/platform/management-companies/not-a-uuid/members')
      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })

  // ════════════════════════════════════════════════════════════════════════════
  // GET /platform/management-companies/:companyId/primary-admin
  // ════════════════════════════════════════════════════════════════════════════

  describe('GET — Primary Admin', function () {

    it('should return 404 when no primary admin exists', async function () {
      const res = await request(primaryAdminUrl())
      expect(res.status).toBe(404)
    })

    it('should return the primary admin when one exists', async function () {
      await addPrimaryAdmin()

      const res = await request(primaryAdminUrl())
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { userId: string; isPrimaryAdmin: boolean } }
      expect(json.data.userId).toBe(MOCK_USER_ID)
      expect(json.data.isPrimaryAdmin).toBe(true)
    })

    it('should not return a non-primary member as primary admin', async function () {
      await addRegularMember()

      const res = await request(primaryAdminUrl())
      expect(res.status).toBe(404)
    })
  })

  // ════════════════════════════════════════════════════════════════════════════
  // PATCH /platform/management-company-members/:id
  // ════════════════════════════════════════════════════════════════════════════

  describe('PATCH — Update Member', function () {

    it('should update member role', async function () {
      const member = await addRegularMember()

      const res = await request(memberUrl(member.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleName: 'support' }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: { roleName: string } }
      expect(json.data.roleName).toBe('support')
    })

    it('should update isPrimaryAdmin flag', async function () {
      const member = await addRegularMember()

      const res = await request(memberUrl(member.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimaryAdmin: true }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: { isPrimaryAdmin: boolean } }
      expect(json.data.isPrimaryAdmin).toBe(true)
    })

    it('should return 404 for non-existent member id', async function () {
      const fakeId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      const res = await request(memberUrl(fakeId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleName: 'viewer' }),
      })

      expect(res.status).toBe(404)
    })

    it('should return 400 for invalid UUID param', async function () {
      const res = await request(memberUrl('invalid-uuid'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleName: 'viewer' }),
      })

      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })

  // ════════════════════════════════════════════════════════════════════════════
  // PATCH /platform/management-company-members/:id/permissions
  // ════════════════════════════════════════════════════════════════════════════

  describe('PATCH — Update Permissions', function () {

    it('should update member permissions', async function () {
      const member = await addRegularMember()

      const newPerms = {
        can_change_subscription: true,
        can_manage_members: true,
        can_create_tickets: true,
        can_view_invoices: true,
      }

      const res = await request(permissionsUrl(member.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: newPerms }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: { permissions: Record<string, boolean> } }
      expect(json.data.permissions).toEqual(newPerms)
    })

    it('should return 400 for non-existent member', async function () {
      const fakeId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      const res = await request(permissionsUrl(fakeId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: { can_change_subscription: true },
        }),
      })

      expect(res.status).toBe(400)
      const json = await res.json() as { error: string }
      expect(json.error).toContain('not found')
    })

    it('should return 422 when permissions field is missing', async function () {
      const member = await addRegularMember()

      const res = await request(permissionsUrl(member.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(422)
    })

    it('should reject updating permissions of an inactive member', async function () {
      const member = await addRegularMember()

      // Soft-delete the member first
      await request(memberUrl(member.id), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deactivatedBy: MOCK_USER_ID }),
      })

      // Try to update permissions -- the service's getById filters inactive by default
      // so this returns "Member not found" rather than "inactive"
      const res = await request(permissionsUrl(member.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: { can_change_subscription: true },
        }),
      })

      expect(res.status).toBe(400)
      const json = await res.json() as { error: string }
      expect(json.error).toContain('not found')
    })
  })

  // ════════════════════════════════════════════════════════════════════════════
  // DELETE /platform/management-company-members/:id
  // ════════════════════════════════════════════════════════════════════════════

  describe('DELETE — Remove Member (soft delete)', function () {

    it('should soft-delete a member and return the deactivated record', async function () {
      const member = await addRegularMember()

      const res = await request(memberUrl(member.id), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deactivatedBy: MOCK_USER_ID }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: { isActive: boolean; deactivatedBy: string } }
      expect(json.data.isActive).toBe(false)
      expect(json.data.deactivatedBy).toBe(MOCK_USER_ID)
    })

    it('should not appear in active members list after removal', async function () {
      await addPrimaryAdmin()
      const member = await addRegularMember()

      // Remove the regular member
      await request(memberUrl(member.id), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deactivatedBy: MOCK_USER_ID }),
      })

      // List members (default filter is active only via isActive query)
      const listRes = await request(`${membersUrl()}?isActive=true`)
      expect(listRes.status).toBe(200)
      const json = await listRes.json() as { data: unknown[] }
      expect(json.data).toHaveLength(1)
    })

    it('should return 404 for non-existent member', async function () {
      const fakeId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      const res = await request(memberUrl(fakeId), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deactivatedBy: MOCK_USER_ID }),
      })

      expect(res.status).toBe(404)
      const json = await res.json() as { error: string }
      expect(json.error).toContain('not found')
    })

    it('should return 422 when deactivatedBy is missing', async function () {
      const member = await addRegularMember()

      const res = await request(memberUrl(member.id), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(422)
    })

    it('should return 422 when deactivatedBy is not a valid UUID', async function () {
      const member = await addRegularMember()

      const res = await request(memberUrl(member.id), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deactivatedBy: 'not-a-uuid' }),
      })

      expect(res.status).toBe(422)
    })
  })

  // ════════════════════════════════════════════════════════════════════════════
  // End-to-end composite flow
  // ════════════════════════════════════════════════════════════════════════════

  describe('Full lifecycle flow', function () {

    it('add primary admin -> add member -> update permissions -> remove member -> verify state', async function () {
      // 1. Add primary admin
      const admin = await addPrimaryAdmin()

      // 2. Add regular member
      const member = await addRegularMember()

      // 3. Verify both appear in list
      let listRes = await request(membersUrl())
      let listJson = await listRes.json() as { data: unknown[] }
      expect(listJson.data).toHaveLength(2)

      // 4. Update member permissions
      const patchRes = await request(permissionsUrl(member.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: {
            can_change_subscription: true,
            can_manage_members: false,
            can_create_tickets: true,
            can_view_invoices: true,
          },
        }),
      })
      expect(patchRes.status).toBe(200)
      const patchJson = await patchRes.json() as { data: { permissions: Record<string, boolean> } }
      expect(patchJson.data.permissions.can_change_subscription).toBe(true)
      expect(patchJson.data.permissions.can_view_invoices).toBe(true)

      // 5. Remove the regular member
      const deleteRes = await request(memberUrl(member.id), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deactivatedBy: MOCK_USER_ID }),
      })
      expect(deleteRes.status).toBe(200)

      // 6. Verify only primary admin remains active
      listRes = await request(`${membersUrl()}?isActive=true`)
      listJson = await listRes.json() as { data: unknown[] }
      expect(listJson.data).toHaveLength(1)

      // 7. Primary admin endpoint still works
      const primaryRes = await request(primaryAdminUrl())
      expect(primaryRes.status).toBe(200)
      const primaryJson = await primaryRes.json() as { data: { id: string } }
      expect(primaryJson.data.id).toBe(admin.id)
    })
  })
})
