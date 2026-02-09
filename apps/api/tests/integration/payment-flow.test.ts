/**
 * Integration Tests: Payment Flow
 *
 * Tests the complete payment lifecycle through the HTTP layer:
 * 1. Report payment → pending_verification
 * 2. Verify payment → completed
 * 3. Reject payment → rejected
 * 4. Refund completed payment → refunded (with quota reversal)
 * 5. Invalid state transitions (400 errors)
 * 6. Query endpoints (by user, unit, status, date-range, payment number, pending)
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { startTestContainer, cleanDatabase } from '../setup/test-container'
import { createTestApp } from '../http/controllers/test-utils'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { PaymentsRepository } from '@database/repositories'
import { PaymentsController } from '@http/controllers/payments/payments.controller'

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000'

let db: TDrizzleClient
let app: Hono
let request: (path: string, options?: RequestInit) => Promise<Response>

// IDs populated during beforeEach
let unitId: string
let currencyId: string

beforeAll(async () => {
  db = await startTestContainer()
})

beforeEach(async () => {
  await cleanDatabase(db)

  // 1. Insert mock user
  await db.execute(sql`
    INSERT INTO users (id, firebase_uid, email, display_name, first_name, last_name, is_active, is_email_verified, preferred_language)
    VALUES (${MOCK_USER_ID}, 'firebase-uid-1', 'payer@test.com', 'Test Payer', 'Test', 'Payer', true, true, 'es')
  `)

  // 2. Insert currency
  const currResult = await db.execute(sql`
    INSERT INTO currencies (code, name, symbol, is_base_currency, is_active, decimals, registered_by)
    VALUES ('USD', 'US Dollar', '$', true, true, 2, ${MOCK_USER_ID})
    RETURNING id
  `) as unknown as { id: string }[]
  currencyId = currResult[0]!.id

  // 3. Insert condominium
  const condoResult = await db.execute(sql`
    INSERT INTO condominiums (name, is_active, created_by)
    VALUES ('Test Condominium', true, ${MOCK_USER_ID})
    RETURNING id
  `) as unknown as { id: string }[]
  const condominiumId = condoResult[0]!.id

  // 4. Insert building
  const buildingResult = await db.execute(sql`
    INSERT INTO buildings (condominium_id, name, code, floors_count, units_count, is_active)
    VALUES (${condominiumId}, 'Torre A', 'TA', 10, 40, true)
    RETURNING id
  `) as unknown as { id: string }[]
  const buildingId = buildingResult[0]!.id

  // 5. Insert unit
  const unitResult = await db.execute(sql`
    INSERT INTO units (building_id, unit_number, floor, area_m2, aliquot_percentage, is_active)
    VALUES (${buildingId}, '101', 1, 85.50, 2.50, true)
    RETURNING id
  `) as unknown as { id: string }[]
  unitId = unitResult[0]!.id

  // 6. Set up controller + app
  const repository = new PaymentsRepository(db)
  const controller = new PaymentsController(repository, db)

  app = createTestApp()
  app.route('/condominium/payments', controller.createRouter())

  request = async (path: string, options?: RequestInit) => app.request(path, options)
})

afterAll(async () => {
  // Test container cleanup handled by global teardown
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function paymentBody(overrides: Record<string, unknown> = {}) {
  return {
    userId: MOCK_USER_ID,
    unitId,
    amount: '150.00',
    currencyId,
    paidAmount: null,
    paidCurrencyId: null,
    exchangeRate: null,
    paymentMethod: 'transfer',
    paymentGatewayId: null,
    paymentDetails: null,
    paymentDate: '2026-02-01',
    status: 'pending_verification',
    receiptUrl: null,
    receiptNumber: null,
    paymentNumber: null,
    notes: null,
    metadata: null,
    registeredBy: null,
    ...overrides,
  }
}

async function reportPayment(overrides: Record<string, unknown> = {}) {
  return request('/condominium/payments/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentBody(overrides)),
  })
}

async function verifyPayment(paymentId: string, notes?: string) {
  return request(`/condominium/payments/${paymentId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  })
}

async function rejectPayment(paymentId: string, notes?: string) {
  return request(`/condominium/payments/${paymentId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  })
}

async function refundPayment(paymentId: string, refundReason: string) {
  return request(`/condominium/payments/${paymentId}/refund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refundReason }),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Payment Flow — Integration', function () {

  // ─── Report Payment ──────────────────────────────────────────────────────

  describe('Report Payment', function () {

    it('creates a payment with pending_verification status', async function () {
      const res = await reportPayment()
      expect(res.status).toBe(201)
      const json = await res.json() as { data: { id: string; status: string; registeredBy: string } }
      expect(json.data.status).toBe('pending_verification')
      expect(json.data.registeredBy).toBe(MOCK_USER_ID)
    })

    it('creates a payment with receipt details', async function () {
      const res = await reportPayment({
        receiptNumber: 'REC-001',
        notes: 'Transfer from BNC',
        paymentMethod: 'cash',
      })
      expect(res.status).toBe(201)
      const json = await res.json() as { data: { receiptNumber: string; notes: string; paymentMethod: string } }
      expect(json.data.receiptNumber).toBe('REC-001')
      expect(json.data.notes).toBe('Transfer from BNC')
      expect(json.data.paymentMethod).toBe('cash')
    })
  })

  // ─── Verify Payment ──────────────────────────────────────────────────────

  describe('Verify Payment', function () {

    it('transitions payment from pending_verification to completed', async function () {
      // Report
      const reportRes = await reportPayment()
      const reportJson = await reportRes.json() as { data: { id: string } }
      const paymentId = reportJson.data.id

      // Verify
      const verifyRes = await verifyPayment(paymentId, 'Checked bank transfer')
      expect(verifyRes.status).toBe(200)
      const verifyJson = await verifyRes.json() as { data: { status: string; verifiedBy: string }; message: string }
      expect(verifyJson.data.status).toBe('completed')
      expect(verifyJson.data.verifiedBy).toBe(MOCK_USER_ID)
      expect(verifyJson.message).toBe('Payment verified successfully')
    })

    it('returns 404 for non-existent payment', async function () {
      const res = await verifyPayment('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
      expect(res.status).toBe(404)
    })

    it('returns 400 when payment is not pending_verification', async function () {
      // Report → Verify → try Verify again
      const reportRes = await reportPayment()
      const reportJson = await reportRes.json() as { data: { id: string } }
      const paymentId = reportJson.data.id

      await verifyPayment(paymentId)

      const res = await verifyPayment(paymentId)
      expect(res.status).toBe(400)
    })
  })

  // ─── Reject Payment ──────────────────────────────────────────────────────

  describe('Reject Payment', function () {

    it('transitions payment from pending_verification to rejected', async function () {
      const reportRes = await reportPayment()
      const reportJson = await reportRes.json() as { data: { id: string } }
      const paymentId = reportJson.data.id

      const rejectRes = await rejectPayment(paymentId, 'Receipt does not match')
      expect(rejectRes.status).toBe(200)
      const rejectJson = await rejectRes.json() as { data: { status: string }; message: string }
      expect(rejectJson.data.status).toBe('rejected')
      expect(rejectJson.message).toBe('Payment rejected')
    })

    it('returns 404 for non-existent payment', async function () {
      const res = await rejectPayment('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
      expect(res.status).toBe(404)
    })

    it('returns 400 when payment is already rejected', async function () {
      const reportRes = await reportPayment()
      const reportJson = await reportRes.json() as { data: { id: string } }
      const paymentId = reportJson.data.id

      await rejectPayment(paymentId)

      const res = await rejectPayment(paymentId)
      expect(res.status).toBe(400)
    })

    it('returns 400 when payment is completed (not pending_verification)', async function () {
      const reportRes = await reportPayment()
      const reportJson = await reportRes.json() as { data: { id: string } }
      const paymentId = reportJson.data.id

      await verifyPayment(paymentId) // completed

      const res = await rejectPayment(paymentId)
      expect(res.status).toBe(400)
    })
  })

  // ─── Refund Payment ──────────────────────────────────────────────────────

  describe('Refund Payment', function () {

    it('transitions completed payment to refunded', async function () {
      // Report → Verify → Refund
      const reportRes = await reportPayment()
      const reportJson = await reportRes.json() as { data: { id: string } }
      const paymentId = reportJson.data.id

      await verifyPayment(paymentId)

      const refundRes = await refundPayment(paymentId, 'Duplicate payment')
      expect(refundRes.status).toBe(200)
      const refundJson = await refundRes.json() as { data: { status: string }; reversedApplications: number; message: string }
      expect(refundJson.data.status).toBe('refunded')
      expect(refundJson.reversedApplications).toBe(0) // no quota applications in this test
      expect(refundJson.message).toContain('refunded')
    })

    it('returns 404 for non-existent payment', async function () {
      const res = await refundPayment('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'test')
      expect(res.status).toBe(404)
    })

    it('returns 400 when payment is pending_verification (not completed)', async function () {
      const reportRes = await reportPayment()
      const reportJson = await reportRes.json() as { data: { id: string } }
      const paymentId = reportJson.data.id

      const res = await refundPayment(paymentId, 'Should fail')
      expect(res.status).toBe(400)
    })

    it('returns 400 when payment is already refunded', async function () {
      const reportRes = await reportPayment()
      const reportJson = await reportRes.json() as { data: { id: string } }
      const paymentId = reportJson.data.id

      await verifyPayment(paymentId)
      await refundPayment(paymentId, 'First refund')

      const res = await refundPayment(paymentId, 'Second refund')
      expect(res.status).toBe(400)
    })
  })

  // ─── Full Lifecycle ──────────────────────────────────────────────────────

  describe('Full Lifecycle', function () {

    it('report → verify → refund: DB state is consistent', async function () {
      // Report
      const reportRes = await reportPayment({ notes: 'Monthly quota' })
      expect(reportRes.status).toBe(201)
      const reportJson = await reportRes.json() as { data: { id: string } }
      const paymentId = reportJson.data.id

      // Verify
      const verifyRes = await verifyPayment(paymentId, 'Bank confirmed')
      expect(verifyRes.status).toBe(200)

      // Read directly from DB to confirm
      const paymentsRepo = new PaymentsRepository(db)
      const dbPayment = await paymentsRepo.getById(paymentId)
      expect(dbPayment).not.toBeNull()
      expect(dbPayment!.status).toBe('completed')
      expect(dbPayment!.verifiedBy).toBe(MOCK_USER_ID)
      expect(dbPayment!.verifiedAt).not.toBeNull()

      // Refund
      const refundRes = await refundPayment(paymentId, 'Customer request')
      expect(refundRes.status).toBe(200)

      // Confirm refund in DB
      const refundedPayment = await paymentsRepo.getById(paymentId)
      expect(refundedPayment).not.toBeNull()
      expect(refundedPayment!.status).toBe('refunded')
      expect(refundedPayment!.notes).toContain('REFUND')
      expect(refundedPayment!.notes).toContain('Customer request')
    })

    it('report → reject: cannot verify after rejection', async function () {
      const reportRes = await reportPayment()
      const reportJson = await reportRes.json() as { data: { id: string } }
      const paymentId = reportJson.data.id

      // Reject
      await rejectPayment(paymentId, 'Invalid receipt')

      // Try verify
      const verifyRes = await verifyPayment(paymentId)
      expect(verifyRes.status).toBe(400)

      // Try refund
      const refundRes = await refundPayment(paymentId, 'test')
      expect(refundRes.status).toBe(400)
    })
  })

  // ─── Query Endpoints ─────────────────────────────────────────────────────

  describe('Query Endpoints', function () {

    it('GET /pending-verification returns only pending payments', async function () {
      // Create 3 payments: 2 pending, 1 verified
      await reportPayment({ notes: 'payment-1' })
      await reportPayment({ notes: 'payment-2' })
      const res3 = await reportPayment({ notes: 'payment-3' })
      const json3 = await res3.json() as { data: { id: string } }
      await verifyPayment(json3.data.id)

      const res = await request('/condominium/payments/pending-verification')
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { status: string }[] }
      expect(json.data).toHaveLength(2)
      for (const p of json.data) {
        expect(p.status).toBe('pending_verification')
      }
    })

    it('GET /user/:userId returns payments for user', async function () {
      await reportPayment()
      await reportPayment({ amount: '200.00' })

      const res = await request(`/condominium/payments/user/${MOCK_USER_ID}`)
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { userId: string }[] }
      expect(json.data).toHaveLength(2)
      for (const p of json.data) {
        expect(p.userId).toBe(MOCK_USER_ID)
      }
    })

    it('GET /unit/:unitId returns payments for unit', async function () {
      await reportPayment()

      const res = await request(`/condominium/payments/unit/${unitId}`)
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { unitId: string }[] }
      expect(json.data).toHaveLength(1)
      expect(json.data[0]!.unitId).toBe(unitId)
    })

    it('GET /status/:status returns payments with matching status', async function () {
      // Create 2 payments: 1 pending_verification, 1 completed
      await reportPayment()
      const res2 = await reportPayment()
      const json2 = await res2.json() as { data: { id: string } }
      await verifyPayment(json2.data.id)

      const res = await request('/condominium/payments/status/completed')
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { status: string }[] }
      expect(json.data).toHaveLength(1)
      expect(json.data[0]!.status).toBe('completed')
    })

    it('GET /status/:status returns 400 for invalid status', async function () {
      const res = await request('/condominium/payments/status/invalid_status')
      expect(res.status).toBe(400)
    })

    it('GET /date-range returns payments within range', async function () {
      await reportPayment({ paymentDate: '2026-01-15' })
      await reportPayment({ paymentDate: '2026-02-01' })
      await reportPayment({ paymentDate: '2026-03-10' })

      const res = await request('/condominium/payments/date-range?startDate=2026-01-01&endDate=2026-02-28')
      expect(res.status).toBe(200)
      const json = await res.json() as { data: unknown[] }
      expect(json.data).toHaveLength(2)
    })

    it('GET /date-range returns 400 for invalid date format', async function () {
      const res = await request('/condominium/payments/date-range?startDate=invalid&endDate=2026-02-28')
      expect(res.status).toBe(400)
    })

    it('GET /:id returns a single payment', async function () {
      const reportRes = await reportPayment()
      const reportJson = await reportRes.json() as { data: { id: string } }
      const paymentId = reportJson.data.id

      const res = await request(`/condominium/payments/${paymentId}`)
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { id: string; amount: string } }
      expect(json.data.id).toBe(paymentId)
      expect(json.data.amount).toBe('150.00')
    })

    it('GET /:id returns 404 for non-existent payment', async function () {
      const res = await request('/condominium/payments/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
      expect(res.status).toBe(404)
    })

    it('GET / lists all payments', async function () {
      await reportPayment()
      await reportPayment({ amount: '250.00' })

      const res = await request('/condominium/payments')
      expect(res.status).toBe(200)
      const json = await res.json() as { data: unknown[] }
      expect(json.data).toHaveLength(2)
    })

    it('GET /number/:paymentNumber returns payment by number', async function () {
      await reportPayment({ paymentNumber: 'PAY-2026-001' })

      const res = await request('/condominium/payments/number/PAY-2026-001')
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { paymentNumber: string } }
      expect(json.data.paymentNumber).toBe('PAY-2026-001')
    })

    it('GET /number/:paymentNumber returns 404 for non-existent', async function () {
      const res = await request('/condominium/payments/number/NONEXISTENT')
      expect(res.status).toBe(404)
    })
  })

  // ─── CRUD Operations ─────────────────────────────────────────────────────

  describe('CRUD Operations', function () {

    it('POST / creates a payment directly (admin)', async function () {
      const res = await request('/condominium/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentBody({ status: 'completed' })),
      })
      expect(res.status).toBe(201)
      const json = await res.json() as { data: { id: string } }
      expect(json.data.id).toBeTruthy()
    })

    it('PATCH /:id updates a payment', async function () {
      const reportRes = await reportPayment()
      const reportJson = await reportRes.json() as { data: { id: string } }
      const paymentId = reportJson.data.id

      const res = await request(`/condominium/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Updated notes', amount: '175.00' }),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { notes: string; amount: string } }
      expect(json.data.notes).toBe('Updated notes')
      expect(json.data.amount).toBe('175.00')
    })

    it('DELETE /:id hard-deletes a payment', async function () {
      const reportRes = await reportPayment()
      const reportJson = await reportRes.json() as { data: { id: string } }
      const paymentId = reportJson.data.id

      const deleteRes = await request(`/condominium/payments/${paymentId}`, {
        method: 'DELETE',
      })
      expect(deleteRes.status).toBe(204)

      // Confirm deleted
      const getRes = await request(`/condominium/payments/${paymentId}`)
      expect(getRes.status).toBe(404)
    })
  })
})
