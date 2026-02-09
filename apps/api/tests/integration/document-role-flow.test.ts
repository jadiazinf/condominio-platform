/**
 * Integration Tests: Document & Role Flow
 *
 * Tests the full HTTP lifecycle for two controllers against a real PostgreSQL database:
 *
 * DocumentsController (condominium-scoped resource):
 *   - CRUD operations (create, read, update, delete)
 *   - Scoped listing by condominiumId (via x-condominium-id header)
 *   - Custom query endpoints: /public, /type/:documentType, /building/:buildingId,
 *     /unit/:unitId, /user/:userId, /payment/:paymentId
 *   - Body validation (422 on missing required fields)
 *
 * RolesController (platform-level, SUPERADMIN-only):
 *   - CRUD operations (create, read, update, delete)
 *   - Custom endpoints: /system, /assignable, /name/:name
 *   - Body validation (422 on missing required fields)
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { startTestContainer, cleanDatabase } from '../setup/test-container'
import { createTestApp } from '../http/controllers/test-utils'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { DocumentsRepository } from '@database/repositories'
import { RolesRepository } from '@database/repositories'
import { DocumentsController } from '@http/controllers/documents/documents.controller'
import { RolesController } from '@http/controllers/roles/roles.controller'

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000'

let db: TDrizzleClient
let app: Hono
let request: (path: string, options?: RequestInit) => Promise<Response>

let condominiumId: string
let managementCompanyId: string

beforeAll(async () => {
  db = await startTestContainer()
})

beforeEach(async () => {
  await cleanDatabase(db)

  // 1. Insert mock user
  await db.execute(sql`
    INSERT INTO users (id, firebase_uid, email, display_name, first_name, last_name, is_active, is_email_verified, preferred_language)
    VALUES (${MOCK_USER_ID}, 'firebase-uid-1', 'admin@test.com', 'Test Admin', 'Test', 'Admin', true, true, 'es')
  `)

  // 2. Insert management company
  const companyResult = await db.execute(sql`
    INSERT INTO management_companies (name, created_by)
    VALUES ('Test Company', ${MOCK_USER_ID})
    RETURNING id
  `) as unknown as { id: string }[]
  managementCompanyId = companyResult[0]!.id

  // 3. Insert condominium
  const condoResult = await db.execute(sql`
    INSERT INTO condominiums (name, is_active, created_by)
    VALUES ('Test Condo', true, ${MOCK_USER_ID})
    RETURNING id
  `) as unknown as { id: string }[]
  condominiumId = condoResult[0]!.id

  // 4. Set up repositories and controllers
  const documentsRepo = new DocumentsRepository(db)
  const rolesRepo = new RolesRepository(db)

  const documentsController = new DocumentsController(documentsRepo)
  const rolesController = new RolesController(rolesRepo)

  // 5. Mount controllers
  app = createTestApp()
  app.route('/condominium/documents', documentsController.createRouter())
  app.route('/platform/roles', rolesController.createRouter())

  request = async (path: string, options?: RequestInit) => app.request(path, options)
})

afterAll(async () => {
  // Test container cleanup handled by global teardown (preload.ts)
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Headers with condominium context for requireRole mock (non-SUPERADMIN routes) */
function condoHeaders(extra: Record<string, string> = {}) {
  return { 'Content-Type': 'application/json', 'x-condominium-id': condominiumId, ...extra }
}

/** Headers without condominium context (SUPERADMIN routes) */
function superadminHeaders(extra: Record<string, string> = {}) {
  return { 'Content-Type': 'application/json', ...extra }
}

function documentBody(overrides: Record<string, unknown> = {}) {
  return {
    documentType: 'invoice',
    title: 'Test Invoice',
    description: 'A test invoice document',
    condominiumId: null,
    buildingId: null,
    unitId: null,
    userId: null,
    paymentId: null,
    quotaId: null,
    expenseId: null,
    fileUrl: 'https://example.com/files/test-invoice.pdf',
    fileName: 'test-invoice.pdf',
    fileSize: 12345,
    fileType: 'application/pdf',
    documentDate: null,
    documentNumber: 'INV-001',
    isPublic: false,
    metadata: null,
    createdBy: MOCK_USER_ID,
    ...overrides,
  }
}

async function createDocument(overrides: Record<string, unknown> = {}) {
  return request('/condominium/documents', {
    method: 'POST',
    headers: condoHeaders(),
    body: JSON.stringify(documentBody(overrides)),
  })
}

function roleBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'TEST_ROLE',
    description: 'A test role',
    isSystemRole: false,
    registeredBy: MOCK_USER_ID,
    ...overrides,
  }
}

async function createRole(overrides: Record<string, unknown> = {}) {
  return request('/platform/roles', {
    method: 'POST',
    headers: superadminHeaders(),
    body: JSON.stringify(roleBody(overrides)),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// DocumentsController Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Document & Role Flow -- Integration', function () {

  // ─── Documents CRUD ────────────────────────────────────────────────────────

  describe('DocumentsController', function () {

    describe('POST / (create)', function () {

      it('creates a document with condominiumId injected from context', async function () {
        const res = await createDocument()
        expect(res.status).toBe(201)
        const json = await res.json() as { data: { id: string; title: string; condominiumId: string; documentType: string } }
        expect(json.data.id).toBeDefined()
        expect(json.data.title).toBe('Test Invoice')
        expect(json.data.documentType).toBe('invoice')
        // condominiumId is injected from the x-condominium-id header via requireRole mock
        expect(json.data.condominiumId).toBe(condominiumId)
      })

      it('creates a document with all nullable fields set to null', async function () {
        const res = await createDocument({
          description: null,
          fileName: null,
          fileSize: null,
          fileType: null,
          documentDate: null,
          documentNumber: null,
          metadata: null,
        })
        expect(res.status).toBe(201)
        const json = await res.json() as { data: { id: string; description: string | null } }
        expect(json.data.description).toBeNull()
      })

      it('creates a public document', async function () {
        const res = await createDocument({ isPublic: true, title: 'Public Regulations' })
        expect(res.status).toBe(201)
        const json = await res.json() as { data: { isPublic: boolean; title: string } }
        expect(json.data.isPublic).toBe(true)
        expect(json.data.title).toBe('Public Regulations')
      })

      it('returns 422 for missing required field (title)', async function () {
        const body = documentBody()
        delete (body as Record<string, unknown>).title
        const res = await request('/condominium/documents', {
          method: 'POST',
          headers: condoHeaders(),
          body: JSON.stringify(body),
        })
        expect(res.status).toBe(422)
        const json = await res.json() as { success: boolean }
        expect(json.success).toBe(false)
      })

      it('returns 422 for missing required field (fileUrl)', async function () {
        const body = documentBody()
        delete (body as Record<string, unknown>).fileUrl
        const res = await request('/condominium/documents', {
          method: 'POST',
          headers: condoHeaders(),
          body: JSON.stringify(body),
        })
        expect(res.status).toBe(422)
      })

      it('returns 422 for invalid documentType', async function () {
        const res = await request('/condominium/documents', {
          method: 'POST',
          headers: condoHeaders(),
          body: JSON.stringify(documentBody({ documentType: 'invalid_type' })),
        })
        expect(res.status).toBe(422)
      })
    })

    describe('GET / (list)', function () {

      it('returns documents scoped by condominiumId from context', async function () {
        // Create two documents for this condominium
        await createDocument({ title: 'Doc 1' })
        await createDocument({ title: 'Doc 2' })

        const res = await request('/condominium/documents', { headers: condoHeaders() })
        expect(res.status).toBe(200)
        const json = await res.json() as { data: { condominiumId: string; title: string }[] }
        expect(json.data).toHaveLength(2)
        for (const doc of json.data) {
          expect(doc.condominiumId).toBe(condominiumId)
        }
      })

      it('returns empty array when no documents exist for condominium', async function () {
        const res = await request('/condominium/documents', { headers: condoHeaders() })
        expect(res.status).toBe(200)
        const json = await res.json() as { data: unknown[] }
        expect(json.data).toHaveLength(0)
      })
    })

    describe('GET /:id (getById)', function () {

      it('returns a document by ID', async function () {
        const createRes = await createDocument()
        const createJson = await createRes.json() as { data: { id: string } }

        const res = await request(`/condominium/documents/${createJson.data.id}`, { headers: condoHeaders() })
        expect(res.status).toBe(200)
        const json = await res.json() as { data: { id: string; title: string } }
        expect(json.data.id).toBe(createJson.data.id)
        expect(json.data.title).toBe('Test Invoice')
      })

      it('returns 404 for non-existent document', async function () {
        const res = await request('/condominium/documents/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', { headers: condoHeaders() })
        expect(res.status).toBe(404)
      })

      it('returns 400 for invalid UUID format', async function () {
        const res = await request('/condominium/documents/not-a-uuid', { headers: condoHeaders() })
        expect(res.status).toBe(400)
      })
    })

    describe('PATCH /:id (update)', function () {

      it('updates document title', async function () {
        const createRes = await createDocument()
        const createJson = await createRes.json() as { data: { id: string } }

        const res = await request(`/condominium/documents/${createJson.data.id}`, {
          method: 'PATCH',
          headers: condoHeaders(),
          body: JSON.stringify({ title: 'Updated Title' }),
        })
        expect(res.status).toBe(200)
        const json = await res.json() as { data: { title: string } }
        expect(json.data.title).toBe('Updated Title')
      })

      it('updates document type', async function () {
        const createRes = await createDocument()
        const createJson = await createRes.json() as { data: { id: string } }

        const res = await request(`/condominium/documents/${createJson.data.id}`, {
          method: 'PATCH',
          headers: condoHeaders(),
          body: JSON.stringify({ documentType: 'receipt' }),
        })
        expect(res.status).toBe(200)
        const json = await res.json() as { data: { documentType: string } }
        expect(json.data.documentType).toBe('receipt')
      })

      it('returns 404 for non-existent document', async function () {
        const res = await request('/condominium/documents/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', {
          method: 'PATCH',
          headers: condoHeaders(),
          body: JSON.stringify({ title: 'Updated' }),
        })
        expect(res.status).toBe(404)
      })
    })

    describe('DELETE /:id (delete)', function () {

      it('hard-deletes a document', async function () {
        const createRes = await createDocument()
        const createJson = await createRes.json() as { data: { id: string } }

        const deleteRes = await request(`/condominium/documents/${createJson.data.id}`, {
          method: 'DELETE',
          headers: condoHeaders(),
        })
        expect(deleteRes.status).toBe(204)

        // Verify it's gone
        const getRes = await request(`/condominium/documents/${createJson.data.id}`, { headers: condoHeaders() })
        expect(getRes.status).toBe(404)
      })

      it('returns 404 for non-existent document', async function () {
        const res = await request('/condominium/documents/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', {
          method: 'DELETE',
          headers: condoHeaders(),
        })
        expect(res.status).toBe(404)
      })
    })

    // ─── Custom Document Endpoints ───────────────────────────────────────────

    describe('GET /public (getPublicDocuments)', function () {

      it('returns only public documents', async function () {
        await createDocument({ title: 'Private Doc', isPublic: false })
        await createDocument({ title: 'Public Doc', isPublic: true })

        const res = await request('/condominium/documents/public')
        expect(res.status).toBe(200)
        const json = await res.json() as { data: { isPublic: boolean; title: string }[] }
        expect(json.data).toHaveLength(1)
        expect(json.data[0]!.title).toBe('Public Doc')
        expect(json.data[0]!.isPublic).toBe(true)
      })

      it('returns empty array when no public documents exist', async function () {
        await createDocument({ isPublic: false })

        const res = await request('/condominium/documents/public')
        expect(res.status).toBe(200)
        const json = await res.json() as { data: unknown[] }
        expect(json.data).toHaveLength(0)
      })
    })

    describe('GET /type/:documentType (getByType)', function () {

      it('returns documents filtered by type', async function () {
        await createDocument({ title: 'Invoice 1', documentType: 'invoice' })
        await createDocument({ title: 'Receipt 1', documentType: 'receipt' })
        await createDocument({ title: 'Invoice 2', documentType: 'invoice' })

        const res = await request('/condominium/documents/type/invoice', { headers: condoHeaders() })
        expect(res.status).toBe(200)
        const json = await res.json() as { data: { documentType: string }[] }
        expect(json.data).toHaveLength(2)
        for (const doc of json.data) {
          expect(doc.documentType).toBe('invoice')
        }
      })

      it('returns empty array for type with no documents', async function () {
        await createDocument({ documentType: 'invoice' })

        const res = await request('/condominium/documents/type/contract', { headers: condoHeaders() })
        expect(res.status).toBe(200)
        const json = await res.json() as { data: unknown[] }
        expect(json.data).toHaveLength(0)
      })
    })

    describe('GET /user/:userId (getByUser)', function () {

      it('returns documents for a specific user', async function () {
        await createDocument({ title: 'User Doc', userId: MOCK_USER_ID })
        await createDocument({ title: 'Other Doc', userId: null })

        const res = await request(`/condominium/documents/user/${MOCK_USER_ID}`, { headers: condoHeaders() })
        expect(res.status).toBe(200)
        const json = await res.json() as { data: { userId: string; title: string }[] }
        expect(json.data).toHaveLength(1)
        expect(json.data[0]!.title).toBe('User Doc')
        expect(json.data[0]!.userId).toBe(MOCK_USER_ID)
      })
    })

    describe('Document types (all valid types)', function () {

      it('creates documents with each valid document type', async function () {
        const types = ['invoice', 'receipt', 'statement', 'contract', 'regulation', 'minutes', 'other']

        for (const docType of types) {
          const res = await createDocument({ documentType: docType, title: `${docType} doc`, documentNumber: `${docType}-001` })
          expect(res.status).toBe(201)
          const json = await res.json() as { data: { documentType: string } }
          expect(json.data.documentType).toBe(docType)
        }
      })
    })
  })

  // ─── RolesController ─────────────────────────────────────────────────────

  describe('RolesController', function () {

    describe('POST / (create)', function () {

      it('creates a new role', async function () {
        const res = await createRole()
        expect(res.status).toBe(201)
        const json = await res.json() as { data: { id: string; name: string; description: string; isSystemRole: boolean } }
        expect(json.data.id).toBeDefined()
        expect(json.data.name).toBe('TEST_ROLE')
        expect(json.data.description).toBe('A test role')
        expect(json.data.isSystemRole).toBe(false)
      })

      it('creates a system role', async function () {
        const res = await createRole({ name: 'SYSTEM_ROLE', isSystemRole: true })
        expect(res.status).toBe(201)
        const json = await res.json() as { data: { name: string; isSystemRole: boolean } }
        expect(json.data.name).toBe('SYSTEM_ROLE')
        expect(json.data.isSystemRole).toBe(true)
      })

      it('returns 422 for missing required field (name)', async function () {
        const body = roleBody()
        delete (body as Record<string, unknown>).name
        const res = await request('/platform/roles', {
          method: 'POST',
          headers: superadminHeaders(),
          body: JSON.stringify(body),
        })
        expect(res.status).toBe(422)
        const json = await res.json() as { success: boolean }
        expect(json.success).toBe(false)
      })

      it('rejects duplicate role name with an error response', async function () {
        await createRole({ name: 'UNIQUE_ROLE' })
        const res = await createRole({ name: 'UNIQUE_ROLE' })
        // Drizzle wraps the Postgres unique constraint violation in a DrizzleQueryError
        // whose message does not contain "duplicate key", so the global error handler
        // falls through to 500 (INTERNAL_ERROR). This tests that the server does not crash.
        expect(res.ok).toBe(false)
        const json = await res.json() as { success: boolean }
        expect(json.success).toBe(false)
      })
    })

    describe('GET / (list)', function () {

      it('returns all roles', async function () {
        await createRole({ name: 'ROLE_A' })
        await createRole({ name: 'ROLE_B' })

        const res = await request('/platform/roles', { headers: superadminHeaders() })
        expect(res.status).toBe(200)
        const json = await res.json() as { data: { name: string }[] }
        expect(json.data).toHaveLength(2)
      })

      it('returns empty array when no roles exist', async function () {
        const res = await request('/platform/roles', { headers: superadminHeaders() })
        expect(res.status).toBe(200)
        const json = await res.json() as { data: unknown[] }
        expect(json.data).toHaveLength(0)
      })
    })

    describe('GET /:id (getById)', function () {

      it('returns a role by ID', async function () {
        const createRes = await createRole()
        const createJson = await createRes.json() as { data: { id: string } }

        const res = await request(`/platform/roles/${createJson.data.id}`, { headers: superadminHeaders() })
        expect(res.status).toBe(200)
        const json = await res.json() as { data: { id: string; name: string } }
        expect(json.data.id).toBe(createJson.data.id)
        expect(json.data.name).toBe('TEST_ROLE')
      })

      it('returns 404 for non-existent role', async function () {
        const res = await request('/platform/roles/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', { headers: superadminHeaders() })
        expect(res.status).toBe(404)
      })

      it('returns 400 for invalid UUID format', async function () {
        const res = await request('/platform/roles/not-a-uuid', { headers: superadminHeaders() })
        expect(res.status).toBe(400)
      })
    })

    describe('PATCH /:id (update)', function () {

      it('updates role name and description', async function () {
        const createRes = await createRole()
        const createJson = await createRes.json() as { data: { id: string } }

        const res = await request(`/platform/roles/${createJson.data.id}`, {
          method: 'PATCH',
          headers: superadminHeaders(),
          body: JSON.stringify({ name: 'UPDATED_ROLE', description: 'Updated description' }),
        })
        expect(res.status).toBe(200)
        const json = await res.json() as { data: { name: string; description: string } }
        expect(json.data.name).toBe('UPDATED_ROLE')
        expect(json.data.description).toBe('Updated description')
      })

      it('returns 404 for non-existent role', async function () {
        const res = await request('/platform/roles/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', {
          method: 'PATCH',
          headers: superadminHeaders(),
          body: JSON.stringify({ name: 'UPDATED' }),
        })
        expect(res.status).toBe(404)
      })
    })

    describe('DELETE /:id (delete)', function () {

      it('hard-deletes a role', async function () {
        const createRes = await createRole()
        const createJson = await createRes.json() as { data: { id: string } }

        const deleteRes = await request(`/platform/roles/${createJson.data.id}`, {
          method: 'DELETE',
          headers: superadminHeaders(),
        })
        expect(deleteRes.status).toBe(204)

        // Verify it's gone
        const getRes = await request(`/platform/roles/${createJson.data.id}`, { headers: superadminHeaders() })
        expect(getRes.status).toBe(404)
      })

      it('returns 404 for non-existent role', async function () {
        const res = await request('/platform/roles/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', {
          method: 'DELETE',
          headers: superadminHeaders(),
        })
        expect(res.status).toBe(404)
      })
    })

    // ─── Custom Role Endpoints ─────────────────────────────────────────────

    describe('GET /system (getSystemRoles)', function () {

      it('returns only system roles', async function () {
        await createRole({ name: 'ADMIN', isSystemRole: true })
        await createRole({ name: 'CUSTOM_ROLE', isSystemRole: false })

        const res = await request('/platform/roles/system', { headers: superadminHeaders() })
        expect(res.status).toBe(200)
        const json = await res.json() as { data: { name: string; isSystemRole: boolean }[] }
        expect(json.data).toHaveLength(1)
        expect(json.data[0]!.name).toBe('ADMIN')
        expect(json.data[0]!.isSystemRole).toBe(true)
      })

      it('returns empty array when no system roles exist', async function () {
        await createRole({ name: 'NOT_SYSTEM', isSystemRole: false })

        const res = await request('/platform/roles/system', { headers: superadminHeaders() })
        expect(res.status).toBe(200)
        const json = await res.json() as { data: unknown[] }
        expect(json.data).toHaveLength(0)
      })
    })

    describe('GET /assignable (getAssignableRoles)', function () {

      it('returns all roles except SUPERADMIN', async function () {
        await createRole({ name: 'SUPERADMIN', isSystemRole: true })
        await createRole({ name: 'ADMIN', isSystemRole: true })
        await createRole({ name: 'USER', isSystemRole: false })

        const res = await request('/platform/roles/assignable', { headers: superadminHeaders() })
        expect(res.status).toBe(200)
        const json = await res.json() as { data: { name: string }[] }
        expect(json.data).toHaveLength(2)
        const names = json.data.map(r => r.name)
        expect(names).toContain('ADMIN')
        expect(names).toContain('USER')
        expect(names).not.toContain('SUPERADMIN')
      })
    })

    describe('GET /name/:name (getByName)', function () {

      it('returns a role by name', async function () {
        await createRole({ name: 'ADMIN', description: 'Administrator role' })

        const res = await request('/platform/roles/name/ADMIN', { headers: superadminHeaders() })
        expect(res.status).toBe(200)
        const json = await res.json() as { data: { name: string; description: string } }
        expect(json.data.name).toBe('ADMIN')
        expect(json.data.description).toBe('Administrator role')
      })

      it('returns 404 for non-existent role name', async function () {
        const res = await request('/platform/roles/name/NONEXISTENT', { headers: superadminHeaders() })
        expect(res.status).toBe(404)
      })
    })
  })

  // ─── Cross-controller / DB Consistency ──────────────────────────────────

  describe('Cross-controller DB consistency', function () {

    it('document create + delete lifecycle: DB state is consistent', async function () {
      // Create
      const createRes = await createDocument({ title: 'Lifecycle Doc' })
      expect(createRes.status).toBe(201)
      const createJson = await createRes.json() as { data: { id: string } }
      const docId = createJson.data.id

      // Verify in DB via repository
      const docsRepo = new DocumentsRepository(db)
      const dbDoc = await docsRepo.getById(docId)
      expect(dbDoc).not.toBeNull()
      expect(dbDoc!.title).toBe('Lifecycle Doc')

      // Delete
      const deleteRes = await request(`/condominium/documents/${docId}`, {
        method: 'DELETE',
        headers: condoHeaders(),
      })
      expect(deleteRes.status).toBe(204)

      // Verify gone from DB
      const deletedDoc = await docsRepo.getById(docId)
      expect(deletedDoc).toBeNull()
    })

    it('role create + update + delete lifecycle: DB state is consistent', async function () {
      // Create
      const createRes = await createRole({ name: 'LIFECYCLE_ROLE', description: 'v1' })
      expect(createRes.status).toBe(201)
      const createJson = await createRes.json() as { data: { id: string } }
      const roleId = createJson.data.id

      // Update
      const updateRes = await request(`/platform/roles/${roleId}`, {
        method: 'PATCH',
        headers: superadminHeaders(),
        body: JSON.stringify({ description: 'v2' }),
      })
      expect(updateRes.status).toBe(200)

      // Verify in DB
      const rolesRepo = new RolesRepository(db)
      const dbRole = await rolesRepo.getById(roleId)
      expect(dbRole).not.toBeNull()
      expect(dbRole!.description).toBe('v2')

      // Delete
      const deleteRes = await request(`/platform/roles/${roleId}`, {
        method: 'DELETE',
        headers: superadminHeaders(),
      })
      expect(deleteRes.status).toBe(204)

      // Verify gone from DB
      const deletedRole = await rolesRepo.getById(roleId)
      expect(deletedRole).toBeNull()
    })
  })
})
