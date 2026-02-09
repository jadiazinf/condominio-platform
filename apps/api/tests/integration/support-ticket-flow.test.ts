/**
 * Integration Tests: Support Ticket Flow
 *
 * Tests the complete support ticket lifecycle through the HTTP layer:
 * 1. Create ticket → open
 * 2. Assign ticket → in_progress
 * 3. Resolve ticket → resolved
 * 4. Close ticket → closed
 * 5. Status transitions (valid and invalid)
 * 6. Cancel flow
 * 7. List and filter tickets
 * 8. Update tickets
 *
 * NOTE: GET /platform/support-tickets/:id is skipped because it uses
 * canAccessTicket middleware which depends on DatabaseService.getInstance().getDb()
 * (a separate DB connection not available in test container).
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { startTestContainer, cleanDatabase } from '../setup/test-container'
import { createTestApp } from '../http/controllers/test-utils'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { SupportTicketsRepository } from '@database/repositories'
import { SupportTicketsController } from '@http/controllers/support-tickets/support-tickets.controller'

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const SECOND_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

let db: TDrizzleClient
let app: Hono
let request: (path: string, options?: RequestInit) => Promise<Response>

let companyId: string

beforeAll(async () => {
  db = await startTestContainer()
})

beforeEach(async () => {
  await cleanDatabase(db)

  // 1. Insert mock users
  await db.execute(sql`
    INSERT INTO users (id, firebase_uid, email, display_name, first_name, last_name, is_active, is_email_verified, preferred_language)
    VALUES
      (${MOCK_USER_ID}, 'firebase-uid-1', 'admin@test.com', 'Test Admin', 'Test', 'Admin', true, true, 'es'),
      (${SECOND_USER_ID}, 'firebase-uid-2', 'agent@test.com', 'Support Agent', 'Support', 'Agent', true, true, 'es')
  `)

  // 2. Insert management company
  const companyResult = await db.execute(sql`
    INSERT INTO management_companies (name, created_by)
    VALUES ('Test Company', ${MOCK_USER_ID})
    RETURNING id
  `) as unknown as { id: string }[]
  companyId = companyResult[0]!.id

  // 3. Set up controller + app
  const repository = new SupportTicketsRepository(db)
  const controller = new SupportTicketsController(repository, db)

  app = createTestApp()
  app.route('', controller.createRouter())

  request = async (path: string, options?: RequestInit) => app.request(path, options)
})

afterAll(async () => {
  // Test container cleanup handled by global teardown
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function ticketBody(overrides: Record<string, unknown> = {}) {
  return {
    ticketNumber: 'TICKET-PLACEHOLDER',
    managementCompanyId: companyId,
    createdByUserId: MOCK_USER_ID,
    createdByMemberId: null,
    subject: 'Test ticket subject',
    description: 'Test ticket description with details',
    priority: 'medium',
    status: 'open',
    category: null,
    resolvedAt: null,
    resolvedBy: null,
    solution: null,
    closedAt: null,
    closedBy: null,
    metadata: null,
    tags: null,
    ...overrides,
  }
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function createTicket(overrides: Record<string, unknown> = {}): Promise<{ id: string; ticketNumber: string; status: string }> {
  const res = await request(`/platform/management-companies/${companyId}/tickets`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(ticketBody(overrides)),
  })
  const json = await res.json() as { data: { id: string; ticketNumber: string; status: string } }
  return json.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Create Tickets
// ─────────────────────────────────────────────────────────────────────────────

describe('Support Ticket Flow', () => {
  describe('Create Tickets', () => {
    it('creates a ticket with minimal fields', async () => {
      const res = await request(`/platform/management-companies/${companyId}/tickets`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(ticketBody()),
      })

      expect(res.status).toBe(201)
      const json = await res.json() as { data: Record<string, unknown> }
      expect(json.data.subject).toBe('Test ticket subject')
      expect(json.data.description).toBe('Test ticket description with details')
      expect(json.data.status).toBe('open')
      expect(json.data.priority).toBe('medium')
      expect(json.data.managementCompanyId).toBe(companyId)
      expect(json.data.createdByUserId).toBe(MOCK_USER_ID)
    })

    it('auto-generates ticket number in TICKET-YYYY-XXXXX format', async () => {
      const ticket = await createTicket()
      const year = new Date().getFullYear()
      expect(ticket.ticketNumber).toMatch(new RegExp(`^TICKET-${year}-\\d{5}$`))
    })

    it('creates a ticket with all optional fields', async () => {
      const res = await request(`/platform/management-companies/${companyId}/tickets`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(ticketBody({
          priority: 'urgent',
          category: 'technical',
          tags: ['server', 'critical'],
          metadata: { source: 'dashboard' },
        })),
      })

      expect(res.status).toBe(201)
      const json = await res.json() as { data: Record<string, unknown> }
      expect(json.data.priority).toBe('urgent')
      expect(json.data.category).toBe('technical')
      expect(json.data.tags).toEqual(['server', 'critical'])
      expect(json.data.metadata).toEqual({ source: 'dashboard' })
    })

    it('returns 422 when required field (subject) is missing', async () => {
      const body = ticketBody()
      delete (body as Record<string, unknown>).subject

      const res = await request(`/platform/management-companies/${companyId}/tickets`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
      })

      expect(res.status).toBe(422)
    })

    it('returns 422 when required field (description) is missing', async () => {
      const body = ticketBody()
      delete (body as Record<string, unknown>).description

      const res = await request(`/platform/management-companies/${companyId}/tickets`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
      })

      expect(res.status).toBe(422)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Tests: List & Filter Tickets
  // ─────────────────────────────────────────────────────────────────────────────

  describe('List & Filter Tickets', () => {
    it('GET /platform/support-tickets returns all tickets', async () => {
      await createTicket({ subject: 'Ticket A' })
      await createTicket({ subject: 'Ticket B' })

      const res = await request('/platform/support-tickets', { headers: JSON_HEADERS })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: unknown[]; pagination: { total: number } }
      expect(json.data.length).toBe(2)
      expect(json.pagination.total).toBe(2)
    })

    it('GET /platform/management-companies/:companyId/tickets returns company tickets', async () => {
      await createTicket({ subject: 'Company Ticket' })

      const res = await request(`/platform/management-companies/${companyId}/tickets`, {
        headers: JSON_HEADERS,
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: unknown[]; pagination: { total: number } }
      expect(json.data.length).toBe(1)
      expect(json.pagination.total).toBe(1)
    })

    it('filters tickets by status', async () => {
      await createTicket({ subject: 'Open ticket' })
      const ticket2 = await createTicket({ subject: 'Cancelled ticket' })
      // Cancel the second ticket via status endpoint
      await request(`/platform/support-tickets/${ticket2.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'cancelled' }),
      })

      const res = await request('/platform/support-tickets?status=open', {
        headers: JSON_HEADERS,
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: Record<string, unknown>[]; pagination: { total: number } }
      expect(json.data.length).toBe(1)
      expect((json.data[0] as Record<string, unknown>).subject).toBe('Open ticket')
    })

    it('filters tickets by priority', async () => {
      await createTicket({ subject: 'Low prio', priority: 'low' })
      await createTicket({ subject: 'Urgent', priority: 'urgent' })

      const res = await request('/platform/support-tickets?priority=urgent', {
        headers: JSON_HEADERS,
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: Record<string, unknown>[] }
      expect(json.data.length).toBe(1)
      expect((json.data[0] as Record<string, unknown>).subject).toBe('Urgent')
    })

    it('searches tickets by subject', async () => {
      await createTicket({ subject: 'Login issue' })
      await createTicket({ subject: 'Payment problem' })

      const res = await request('/platform/support-tickets?search=Login', {
        headers: JSON_HEADERS,
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: Record<string, unknown>[] }
      expect(json.data.length).toBe(1)
      expect((json.data[0] as Record<string, unknown>).subject).toBe('Login issue')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Tests: Update Ticket
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Update Ticket', () => {
    it('updates ticket subject and description', async () => {
      const ticket = await createTicket()

      const res = await request(`/platform/support-tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ subject: 'Updated subject', description: 'Updated description' }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: Record<string, unknown> }
      expect(json.data.subject).toBe('Updated subject')
      expect(json.data.description).toBe('Updated description')
    })

    it('updates ticket priority', async () => {
      const ticket = await createTicket()

      const res = await request(`/platform/support-tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ priority: 'high' }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: Record<string, unknown> }
      expect(json.data.priority).toBe('high')
    })

    it('updates ticket category', async () => {
      const ticket = await createTicket()

      const res = await request(`/platform/support-tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ category: 'billing' }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: Record<string, unknown> }
      expect(json.data.category).toBe('billing')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Tests: Assign Ticket
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Assign Ticket', () => {
    it('assigns ticket to a user and changes status to in_progress', async () => {
      const ticket = await createTicket()

      const res = await request(`/platform/support-tickets/${ticket.id}/assign`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ assignedTo: SECOND_USER_ID }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: Record<string, unknown> }
      expect(json.data.status).toBe('in_progress')
    })

    it('reassigns ticket to a different user', async () => {
      const ticket = await createTicket()

      // First assignment
      await request(`/platform/support-tickets/${ticket.id}/assign`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ assignedTo: SECOND_USER_ID }),
      })

      // Reassign to the original user
      const res = await request(`/platform/support-tickets/${ticket.id}/assign`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ assignedTo: MOCK_USER_ID }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: Record<string, unknown> }
      expect(json.data.status).toBe('in_progress')
    })

    it('cannot assign a closed ticket', async () => {
      const ticket = await createTicket()
      // Move to closed: open → cancelled not needed; directly close via repo
      // Actually use valid transitions: open → in_progress → resolved → closed
      await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'in_progress' }),
      })
      await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'resolved' }),
      })
      await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'closed' }),
      })

      const res = await request(`/platform/support-tickets/${ticket.id}/assign`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ assignedTo: SECOND_USER_ID }),
      })

      expect(res.status).toBe(400)
    })

    it('cannot assign a cancelled ticket', async () => {
      const ticket = await createTicket()
      await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'cancelled' }),
      })

      const res = await request(`/platform/support-tickets/${ticket.id}/assign`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ assignedTo: SECOND_USER_ID }),
      })

      expect(res.status).toBe(400)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Tests: Resolve Ticket
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Resolve Ticket', () => {
    it('resolves an in_progress ticket', async () => {
      const ticket = await createTicket()
      // Move to in_progress first
      await request(`/platform/support-tickets/${ticket.id}/assign`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ assignedTo: SECOND_USER_ID }),
      })

      const res = await request(`/platform/support-tickets/${ticket.id}/resolve`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ resolvedBy: MOCK_USER_ID }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: Record<string, unknown> }
      expect(json.data.status).toBe('resolved')
      expect(json.data.resolvedBy).toBe(MOCK_USER_ID)
      expect(json.data.resolvedAt).toBeTruthy()
    })

    it('cannot resolve an already resolved ticket', async () => {
      const ticket = await createTicket()
      await request(`/platform/support-tickets/${ticket.id}/assign`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ assignedTo: SECOND_USER_ID }),
      })
      await request(`/platform/support-tickets/${ticket.id}/resolve`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ resolvedBy: MOCK_USER_ID }),
      })

      const res = await request(`/platform/support-tickets/${ticket.id}/resolve`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ resolvedBy: MOCK_USER_ID }),
      })

      expect(res.status).toBe(400)
    })

    it('cannot resolve a closed ticket', async () => {
      const ticket = await createTicket()
      // open → in_progress → resolved → closed
      await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'in_progress' }),
      })
      await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'resolved' }),
      })
      await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'closed' }),
      })

      const res = await request(`/platform/support-tickets/${ticket.id}/resolve`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ resolvedBy: MOCK_USER_ID }),
      })

      expect(res.status).toBe(400)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Tests: Close Ticket
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Close Ticket', () => {
    it('closes a resolved ticket', async () => {
      const ticket = await createTicket()
      await request(`/platform/support-tickets/${ticket.id}/assign`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ assignedTo: SECOND_USER_ID }),
      })
      await request(`/platform/support-tickets/${ticket.id}/resolve`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ resolvedBy: MOCK_USER_ID }),
      })

      const res = await request(`/platform/support-tickets/${ticket.id}/close`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ closedBy: MOCK_USER_ID }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: Record<string, unknown> }
      expect(json.data.status).toBe('closed')
      expect(json.data.closedBy).toBe(MOCK_USER_ID)
      expect(json.data.closedAt).toBeTruthy()
    })

    it('closes an open ticket directly', async () => {
      const ticket = await createTicket()

      const res = await request(`/platform/support-tickets/${ticket.id}/close`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ closedBy: MOCK_USER_ID }),
      })

      // CloseTicketService allows closing any ticket that isn't already closed or cancelled
      expect(res.status).toBe(200)
      const json = await res.json() as { data: Record<string, unknown> }
      expect(json.data.status).toBe('closed')
    })

    it('cannot close an already closed ticket', async () => {
      const ticket = await createTicket()
      await request(`/platform/support-tickets/${ticket.id}/close`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ closedBy: MOCK_USER_ID }),
      })

      const res = await request(`/platform/support-tickets/${ticket.id}/close`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ closedBy: MOCK_USER_ID }),
      })

      expect(res.status).toBe(400)
    })

    it('cannot close a cancelled ticket', async () => {
      const ticket = await createTicket()
      await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'cancelled' }),
      })

      const res = await request(`/platform/support-tickets/${ticket.id}/close`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ closedBy: MOCK_USER_ID }),
      })

      expect(res.status).toBe(400)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Tests: Status Transitions (via /status endpoint)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Status Transitions', () => {
    it('open → in_progress is valid', async () => {
      const ticket = await createTicket()

      const res = await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'in_progress' }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: Record<string, unknown> }
      expect(json.data.status).toBe('in_progress')
    })

    it('open → waiting_customer is valid', async () => {
      const ticket = await createTicket()

      const res = await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'waiting_customer' }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: Record<string, unknown> }
      expect(json.data.status).toBe('waiting_customer')
    })

    it('open → cancelled is valid', async () => {
      const ticket = await createTicket()

      const res = await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'cancelled' }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: Record<string, unknown> }
      expect(json.data.status).toBe('cancelled')
    })

    it('in_progress → resolved is valid', async () => {
      const ticket = await createTicket()
      await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'in_progress' }),
      })

      const res = await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'resolved' }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: Record<string, unknown> }
      expect(json.data.status).toBe('resolved')
    })

    it('resolved → closed is valid', async () => {
      const ticket = await createTicket()
      await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'in_progress' }),
      })
      await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'resolved' }),
      })

      const res = await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'closed' }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: Record<string, unknown> }
      expect(json.data.status).toBe('closed')
    })

    it('resolved → in_progress is valid (reopen)', async () => {
      const ticket = await createTicket()
      await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'in_progress' }),
      })
      await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'resolved' }),
      })

      const res = await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'in_progress' }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: Record<string, unknown> }
      expect(json.data.status).toBe('in_progress')
    })

    it('open → resolved is invalid', async () => {
      const ticket = await createTicket()

      const res = await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'resolved' }),
      })

      expect(res.status).toBe(400)
    })

    it('open → closed is invalid', async () => {
      const ticket = await createTicket()

      const res = await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'closed' }),
      })

      expect(res.status).toBe(400)
    })

    it('closed → any status is invalid', async () => {
      const ticket = await createTicket()
      // Move to closed: open → in_progress → resolved → closed
      await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'in_progress' }),
      })
      await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'resolved' }),
      })
      await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'closed' }),
      })

      const res = await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'in_progress' }),
      })

      expect(res.status).toBe(400)
    })

    it('cancelled → any status is invalid', async () => {
      const ticket = await createTicket()
      await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'cancelled' }),
      })

      const res = await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'open' }),
      })

      expect(res.status).toBe(400)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Tests: Full Lifecycle
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Full Lifecycle', () => {
    it('complete lifecycle: create → assign → resolve → close', async () => {
      // 1. Create
      const ticket = await createTicket({ subject: 'Lifecycle test' })
      expect(ticket.status).toBe('open')

      // 2. Assign → in_progress
      const assignRes = await request(`/platform/support-tickets/${ticket.id}/assign`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ assignedTo: SECOND_USER_ID }),
      })
      expect(assignRes.status).toBe(200)
      const assigned = (await assignRes.json() as { data: Record<string, unknown> }).data
      expect(assigned.status).toBe('in_progress')

      // 3. Resolve
      const resolveRes = await request(`/platform/support-tickets/${ticket.id}/resolve`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ resolvedBy: MOCK_USER_ID }),
      })
      expect(resolveRes.status).toBe(200)
      const resolved = (await resolveRes.json() as { data: Record<string, unknown> }).data
      expect(resolved.status).toBe('resolved')
      expect(resolved.resolvedBy).toBe(MOCK_USER_ID)

      // 4. Close
      const closeRes = await request(`/platform/support-tickets/${ticket.id}/close`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ closedBy: MOCK_USER_ID }),
      })
      expect(closeRes.status).toBe(200)
      const closed = (await closeRes.json() as { data: Record<string, unknown> }).data
      expect(closed.status).toBe('closed')
      expect(closed.closedBy).toBe(MOCK_USER_ID)
    })

    it('quick cancel: create → cancel', async () => {
      const ticket = await createTicket({ subject: 'Cancel test' })
      expect(ticket.status).toBe('open')

      const res = await request(`/platform/support-tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: 'cancelled' }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { data: Record<string, unknown> }
      expect(json.data.status).toBe('cancelled')
    })
  })
})
