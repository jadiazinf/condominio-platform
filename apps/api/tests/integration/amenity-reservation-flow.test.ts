/**
 * Integration Tests: Amenity Reservation Flow
 *
 * Tests the complete amenity reservation lifecycle through the HTTP layer:
 * 1. Create amenity (admin)
 * 2. Create reservation → pending
 * 3. Approve reservation → approved
 * 4. Reject reservation → rejected
 * 5. Cancel reservation → cancelled
 * 6. Time conflict detection
 * 7. Availability checks
 * 8. Query endpoints (by amenity, by user)
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { startTestContainer, cleanDatabase } from '../setup/test-container'
import { createTestApp } from '../http/controllers/test-utils'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { AmenitiesRepository, AmenityReservationsRepository } from '@database/repositories'
import { AmenitiesController } from '@http/controllers/amenities/amenities.controller'
import { AmenityReservationsController } from '@http/controllers/amenity-reservations/amenity-reservations.controller'

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000'

let db: TDrizzleClient
let app: Hono
let request: (path: string, options?: RequestInit) => Promise<Response>

let condominiumId: string

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

  // 2. Insert condominium
  const condoResult = await db.execute(sql`
    INSERT INTO condominiums (name, is_active, created_by)
    VALUES ('Test Condominium', true, ${MOCK_USER_ID})
    RETURNING id
  `) as unknown as { id: string }[]
  condominiumId = condoResult[0]!.id

  // 3. Set up controllers + app
  const amenitiesRepo = new AmenitiesRepository(db)
  const reservationsRepo = new AmenityReservationsRepository(db)

  const amenitiesController = new AmenitiesController(amenitiesRepo)
  const reservationsController = new AmenityReservationsController(reservationsRepo, amenitiesRepo)

  app = createTestApp()
  app.route('/condominium/amenities', amenitiesController.createRouter())
  app.route('/condominium/amenity-reservations', reservationsController.createRouter())

  request = async (path: string, options?: RequestInit) => app.request(path, options)
})

afterAll(async () => {
  // Test container cleanup handled by global teardown
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function amenityBody(overrides: Record<string, unknown> = {}) {
  return {
    condominiumId,
    name: 'Pool',
    description: 'Olympic swimming pool',
    location: 'Ground floor',
    capacity: 20,
    requiresApproval: true,
    reservationRules: null,
    isActive: true,
    metadata: null,
    createdBy: MOCK_USER_ID,
    ...overrides,
  }
}

/** Common headers with condominium context for requireRole mock */
function headers(extra: Record<string, string> = {}) {
  return { 'Content-Type': 'application/json', 'x-condominium-id': condominiumId, ...extra }
}

async function createAmenity(overrides: Record<string, unknown> = {}) {
  return request('/condominium/amenities', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(amenityBody(overrides)),
  })
}

function reservationBody(amenityId: string, overrides: Record<string, unknown> = {}) {
  return {
    amenityId,
    userId: MOCK_USER_ID,
    startTime: '2026-03-01T10:00:00.000Z',
    endTime: '2026-03-01T12:00:00.000Z',
    notes: null,
    metadata: null,
    ...overrides,
  }
}

async function createReservation(amenityId: string, overrides: Record<string, unknown> = {}) {
  return request('/condominium/amenity-reservations', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(reservationBody(amenityId, overrides)),
  })
}

async function approveReservation(reservationId: string) {
  return request(`/condominium/amenity-reservations/${reservationId}/approve`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ approvedBy: MOCK_USER_ID }),
  })
}

async function rejectReservation(reservationId: string, rejectionReason?: string) {
  return request(`/condominium/amenity-reservations/${reservationId}/reject`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ rejectionReason }),
  })
}

async function cancelReservation(reservationId: string) {
  return request(`/condominium/amenity-reservations/${reservationId}/cancel`, {
    method: 'PATCH',
    headers: headers(),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Amenity Reservation Flow — Integration', function () {

  // ─── Amenity CRUD ────────────────────────────────────────────────────────

  describe('Amenity CRUD', function () {

    it('creates an amenity', async function () {
      const res = await createAmenity()
      expect(res.status).toBe(201)
      const json = await res.json() as { data: { id: string; name: string; condominiumId: string; requiresApproval: boolean } }
      expect(json.data.name).toBe('Pool')
      expect(json.data.condominiumId).toBe(condominiumId)
      expect(json.data.requiresApproval).toBe(true)
    })

    it('updates an amenity', async function () {
      const createRes = await createAmenity()
      const createJson = await createRes.json() as { data: { id: string } }

      const res = await request(`/condominium/amenities/${createJson.data.id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ name: 'Gym', capacity: 15 }),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { name: string; capacity: number } }
      expect(json.data.name).toBe('Gym')
      expect(json.data.capacity).toBe(15)
    })

    it('soft-deletes an amenity', async function () {
      const createRes = await createAmenity()
      const createJson = await createRes.json() as { data: { id: string } }

      const deleteRes = await request(`/condominium/amenities/${createJson.data.id}`, {
        method: 'DELETE',
        headers: headers(),
      })
      expect(deleteRes.status).toBe(204)
    })

    it('GET /:id returns a single amenity', async function () {
      const createRes = await createAmenity()
      const createJson = await createRes.json() as { data: { id: string } }

      const res = await request(`/condominium/amenities/${createJson.data.id}`, { headers: headers() })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { id: string; name: string } }
      expect(json.data.id).toBe(createJson.data.id)
      expect(json.data.name).toBe('Pool')
    })
  })

  // ─── Create Reservation ──────────────────────────────────────────────────

  describe('Create Reservation', function () {

    it('creates a reservation with pending status', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }

      const res = await createReservation(amenityJson.data.id)
      expect(res.status).toBe(201)
      const json = await res.json() as { data: { id: string; status: string; amenityId: string; userId: string } }
      expect(json.data.status).toBe('pending')
      expect(json.data.amenityId).toBe(amenityJson.data.id)
      expect(json.data.userId).toBe(MOCK_USER_ID)
    })

    it('returns 404 for non-existent amenity', async function () {
      const res = await createReservation('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
      expect(res.status).toBe(404)
    })

    it('returns 409 for overlapping time slot', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }
      const amenityId = amenityJson.data.id

      // First reservation: 10:00-12:00
      await createReservation(amenityId)

      // Overlapping: 11:00-13:00
      const res = await createReservation(amenityId, {
        startTime: '2026-03-01T11:00:00.000Z',
        endTime: '2026-03-01T13:00:00.000Z',
      })
      expect(res.status).toBe(409)
    })

    it('allows non-overlapping time slot', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }
      const amenityId = amenityJson.data.id

      // First: 10:00-12:00
      await createReservation(amenityId)

      // Non-overlapping: 14:00-16:00
      const res = await createReservation(amenityId, {
        startTime: '2026-03-01T14:00:00.000Z',
        endTime: '2026-03-01T16:00:00.000Z',
      })
      expect(res.status).toBe(201)
    })
  })

  // ─── Approve Reservation ─────────────────────────────────────────────────

  describe('Approve Reservation', function () {

    it('transitions pending reservation to approved', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }

      const reserveRes = await createReservation(amenityJson.data.id)
      const reserveJson = await reserveRes.json() as { data: { id: string } }

      const res = await approveReservation(reserveJson.data.id)
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { status: string; approvedBy: string; approvedAt: string } }
      expect(json.data.status).toBe('approved')
      expect(json.data.approvedBy).toBe(MOCK_USER_ID)
      expect(json.data.approvedAt).not.toBeNull()
    })

    it('returns 404 for non-existent reservation', async function () {
      const res = await approveReservation('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
      expect(res.status).toBe(404)
    })

    it('returns 400 when reservation is already approved', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }
      const reserveRes = await createReservation(amenityJson.data.id)
      const reserveJson = await reserveRes.json() as { data: { id: string } }

      await approveReservation(reserveJson.data.id)

      const res = await approveReservation(reserveJson.data.id)
      expect(res.status).toBe(400)
    })
  })

  // ─── Reject Reservation ──────────────────────────────────────────────────

  describe('Reject Reservation', function () {

    it('transitions pending reservation to rejected', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }
      const reserveRes = await createReservation(amenityJson.data.id)
      const reserveJson = await reserveRes.json() as { data: { id: string } }

      const res = await rejectReservation(reserveJson.data.id, 'Not available that day')
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { status: string; rejectionReason: string } }
      expect(json.data.status).toBe('rejected')
      expect(json.data.rejectionReason).toBe('Not available that day')
    })

    it('returns 404 for non-existent reservation', async function () {
      const res = await rejectReservation('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
      expect(res.status).toBe(404)
    })

    it('returns 400 when reservation is already rejected', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }
      const reserveRes = await createReservation(amenityJson.data.id)
      const reserveJson = await reserveRes.json() as { data: { id: string } }

      await rejectReservation(reserveJson.data.id)

      const res = await rejectReservation(reserveJson.data.id)
      expect(res.status).toBe(400)
    })
  })

  // ─── Cancel Reservation ──────────────────────────────────────────────────

  describe('Cancel Reservation', function () {

    it('transitions pending reservation to cancelled', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }
      const reserveRes = await createReservation(amenityJson.data.id)
      const reserveJson = await reserveRes.json() as { data: { id: string } }

      const res = await cancelReservation(reserveJson.data.id)
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { status: string; cancelledAt: string } }
      expect(json.data.status).toBe('cancelled')
      expect(json.data.cancelledAt).not.toBeNull()
    })

    it('transitions approved reservation to cancelled', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }
      const reserveRes = await createReservation(amenityJson.data.id)
      const reserveJson = await reserveRes.json() as { data: { id: string } }

      await approveReservation(reserveJson.data.id)

      const res = await cancelReservation(reserveJson.data.id)
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { status: string } }
      expect(json.data.status).toBe('cancelled')
    })

    it('returns 400 when reservation is already cancelled', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }
      const reserveRes = await createReservation(amenityJson.data.id)
      const reserveJson = await reserveRes.json() as { data: { id: string } }

      await cancelReservation(reserveJson.data.id)

      const res = await cancelReservation(reserveJson.data.id)
      expect(res.status).toBe(400)
    })

    it('returns 400 when trying to cancel a rejected reservation', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }
      const reserveRes = await createReservation(amenityJson.data.id)
      const reserveJson = await reserveRes.json() as { data: { id: string } }

      await rejectReservation(reserveJson.data.id)

      const res = await cancelReservation(reserveJson.data.id)
      expect(res.status).toBe(400)
    })
  })

  // ─── Conflict Resolution ─────────────────────────────────────────────────

  describe('Conflict Resolution', function () {

    it('cancelled reservation frees the time slot for new booking', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }
      const amenityId = amenityJson.data.id

      // Book 10:00-12:00
      const res1 = await createReservation(amenityId)
      const json1 = await res1.json() as { data: { id: string } }

      // Cancel it
      await cancelReservation(json1.data.id)

      // Re-book same slot
      const res2 = await createReservation(amenityId)
      expect(res2.status).toBe(201)
    })

    it('rejected reservation frees the time slot for new booking', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }
      const amenityId = amenityJson.data.id

      // Book 10:00-12:00
      const res1 = await createReservation(amenityId)
      const json1 = await res1.json() as { data: { id: string } }

      // Reject it
      await rejectReservation(json1.data.id)

      // Re-book same slot
      const res2 = await createReservation(amenityId)
      expect(res2.status).toBe(201)
    })
  })

  // ─── Query Endpoints ─────────────────────────────────────────────────────

  describe('Query Endpoints', function () {

    it('GET /amenity/:amenityId returns reservations for amenity', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }
      const amenityId = amenityJson.data.id

      await createReservation(amenityId)
      await createReservation(amenityId, {
        startTime: '2026-03-02T10:00:00.000Z',
        endTime: '2026-03-02T12:00:00.000Z',
      })

      const res = await request(`/condominium/amenity-reservations/amenity/${amenityId}`, { headers: headers() })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { amenityId: string }[] }
      expect(json.data).toHaveLength(2)
      for (const r of json.data) {
        expect(r.amenityId).toBe(amenityId)
      }
    })

    it('GET /user/:userId returns reservations for user', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }

      await createReservation(amenityJson.data.id)

      const res = await request(`/condominium/amenity-reservations/user/${MOCK_USER_ID}`, { headers: headers() })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { userId: string }[] }
      expect(json.data).toHaveLength(1)
      expect(json.data[0]!.userId).toBe(MOCK_USER_ID)
    })

    it('GET /check-availability returns availability status', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }
      const amenityId = amenityJson.data.id

      // Book 10:00-12:00
      await createReservation(amenityId)

      // Check overlapping slot → not available
      const busyRes = await request(
        `/condominium/amenity-reservations/check-availability?amenityId=${amenityId}&startTime=2026-03-01T11:00:00.000Z&endTime=2026-03-01T13:00:00.000Z`,
        { headers: headers() }
      )
      expect(busyRes.status).toBe(200)
      const busyJson = await busyRes.json() as { data: { available: boolean; conflictCount: number } }
      expect(busyJson.data.available).toBe(false)
      expect(busyJson.data.conflictCount).toBe(1)

      // Check non-overlapping slot → available
      const freeRes = await request(
        `/condominium/amenity-reservations/check-availability?amenityId=${amenityId}&startTime=2026-03-01T14:00:00.000Z&endTime=2026-03-01T16:00:00.000Z`,
        { headers: headers() }
      )
      expect(freeRes.status).toBe(200)
      const freeJson = await freeRes.json() as { data: { available: boolean; conflictCount: number } }
      expect(freeJson.data.available).toBe(true)
      expect(freeJson.data.conflictCount).toBe(0)
    })

    it('GET /:id returns a single reservation', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }
      const reserveRes = await createReservation(amenityJson.data.id, { notes: 'Birthday party' })
      const reserveJson = await reserveRes.json() as { data: { id: string } }

      const res = await request(`/condominium/amenity-reservations/${reserveJson.data.id}`, { headers: headers() })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { id: string; notes: string } }
      expect(json.data.id).toBe(reserveJson.data.id)
      expect(json.data.notes).toBe('Birthday party')
    })

    it('GET / lists all reservations', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }
      await createReservation(amenityJson.data.id)
      await createReservation(amenityJson.data.id, {
        startTime: '2026-03-02T10:00:00.000Z',
        endTime: '2026-03-02T12:00:00.000Z',
      })

      const res = await request('/condominium/amenity-reservations', { headers: headers() })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: unknown[] }
      expect(json.data).toHaveLength(2)
    })
  })

  // ─── Full Lifecycle ──────────────────────────────────────────────────────

  describe('Full Lifecycle', function () {

    it('create → approve → cancel: DB state is consistent', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }

      // Create
      const createRes = await createReservation(amenityJson.data.id)
      const createJson = await createRes.json() as { data: { id: string } }
      const reservationId = createJson.data.id

      // Approve
      await approveReservation(reservationId)

      // Verify in DB
      const reservationsRepo = new AmenityReservationsRepository(db)
      const dbReservation = await reservationsRepo.getById(reservationId)
      expect(dbReservation).not.toBeNull()
      expect(dbReservation!.status).toBe('approved')
      expect(dbReservation!.approvedBy).toBe(MOCK_USER_ID)

      // Cancel
      await cancelReservation(reservationId)

      const cancelledReservation = await reservationsRepo.getById(reservationId)
      expect(cancelledReservation).not.toBeNull()
      expect(cancelledReservation!.status).toBe('cancelled')
      expect(cancelledReservation!.cancelledAt).not.toBeNull()
    })

    it('create → reject: cannot approve after rejection', async function () {
      const amenityRes = await createAmenity()
      const amenityJson = await amenityRes.json() as { data: { id: string } }
      const reserveRes = await createReservation(amenityJson.data.id)
      const reserveJson = await reserveRes.json() as { data: { id: string } }

      await rejectReservation(reserveJson.data.id, 'Maintenance day')

      const res = await approveReservation(reserveJson.data.id)
      expect(res.status).toBe(400)
    })
  })
})
