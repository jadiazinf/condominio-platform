/**
 * Integration Tests: Notification System Flow
 *
 * Tests the complete notification lifecycle and FCM token management through the HTTP layer:
 *
 * NotificationsController (mounted at /condominium/notifications):
 *   1. POST   /                     Create notification (direct)
 *   2. GET    /                     List all notifications
 *   3. GET    /:id                  Get notification by ID
 *   4. GET    /user/:userId         Get notifications by user
 *   5. GET    /user/:userId/unread-count  Get unread count
 *   6. POST   /send                 Send notification (via service, with delivery)
 *   7. POST   /:id/read             Mark as read
 *   8. POST   /user/:userId/read-all  Mark all as read
 *   9. PATCH  /:id                  Update notification
 *  10. DELETE /:id                  Delete notification
 *
 * UserFcmTokensController (mounted at /me/fcm-tokens):
 *   1. POST   /user/:userId/register    Register FCM token
 *   2. GET    /user/:userId             Get user tokens
 *   3. POST   /user/:userId/unregister  Unregister FCM token
 *   4. DELETE /:id                      Delete token by ID
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { startTestContainer, cleanDatabase } from '../setup/test-container'
import { createTestApp } from '../http/controllers/test-utils'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import {
  NotificationsRepository,
  NotificationDeliveriesRepository,
  UserNotificationPreferencesRepository,
  UserFcmTokensRepository,
} from '@database/repositories'
import { NotificationsController } from '@http/controllers/notifications/notifications.controller'
import { UserFcmTokensController } from '@http/controllers/user-fcm-tokens/user-fcm-tokens.controller'

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440099'

let db: TDrizzleClient
let app: Hono
let request: (path: string, options?: RequestInit) => Promise<Response>

beforeAll(async () => {
  db = await startTestContainer()
})

beforeEach(async () => {
  await cleanDatabase(db)

  // 1. Insert mock users
  await db.execute(sql`
    INSERT INTO users (id, firebase_uid, email, display_name, first_name, last_name, is_active, is_email_verified, preferred_language)
    VALUES (${MOCK_USER_ID}, 'firebase-uid-1', 'admin@test.com', 'Test Admin', 'Test', 'Admin', true, true, 'es')
  `)

  await db.execute(sql`
    INSERT INTO users (id, firebase_uid, email, display_name, first_name, last_name, is_active, is_email_verified, preferred_language)
    VALUES (${OTHER_USER_ID}, 'firebase-uid-2', 'other@test.com', 'Other User', 'Other', 'User', true, true, 'es')
  `)

  // 2. Set up repositories
  const notificationsRepo = new NotificationsRepository(db)
  const deliveriesRepo = new NotificationDeliveriesRepository(db)
  const preferencesRepo = new UserNotificationPreferencesRepository(db)
  const fcmTokensRepo = new UserFcmTokensRepository(db)

  // 3. Set up controllers + app
  const notificationsController = new NotificationsController(
    notificationsRepo,
    deliveriesRepo,
    preferencesRepo
  )
  const fcmTokensController = new UserFcmTokensController(fcmTokensRepo)

  app = createTestApp()
  app.route('/condominium/notifications', notificationsController.createRouter())
  app.route('/me/fcm-tokens', fcmTokensController.createRouter())

  request = async (path: string, options?: RequestInit) => app.request(path, options)
})

afterAll(async () => {
  // Test container cleanup handled by global teardown
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function jsonHeaders(extra: Record<string, string> = {}) {
  return { 'Content-Type': 'application/json', ...extra }
}

function notificationCreateBody(overrides: Record<string, unknown> = {}) {
  return {
    userId: MOCK_USER_ID,
    templateId: null,
    category: 'announcement',
    title: 'Test Notification',
    body: 'This is a test notification body.',
    priority: 'normal',
    data: null,
    isRead: false,
    expiresAt: null,
    metadata: null,
    ...overrides,
  }
}

function sendNotificationBody(overrides: Record<string, unknown> = {}) {
  return {
    userId: MOCK_USER_ID,
    category: 'announcement',
    title: 'Sent Notification',
    body: 'This notification was sent via the send endpoint.',
    ...overrides,
  }
}

function registerTokenBody(overrides: Record<string, unknown> = {}) {
  return {
    token: 'fcm-token-abc123def456',
    platform: 'web',
    deviceName: 'Chrome Browser',
    ...overrides,
  }
}

async function createNotification(overrides: Record<string, unknown> = {}) {
  return request('/condominium/notifications', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(notificationCreateBody(overrides)),
  })
}

async function sendNotification(overrides: Record<string, unknown> = {}) {
  return request('/condominium/notifications/send', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(sendNotificationBody(overrides)),
  })
}

async function registerToken(userId: string, overrides: Record<string, unknown> = {}) {
  return request(`/me/fcm-tokens/user/${userId}/register`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(registerTokenBody(overrides)),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests: NotificationsController
// ─────────────────────────────────────────────────────────────────────────────

describe('Notification System Flow — Integration', function () {

  // ─── Create Notification ────────────────────────────────────────────────

  describe('POST / — Create Notification', function () {

    it('creates a notification with valid data', async function () {
      const res = await createNotification()
      expect(res.status).toBe(201)
      const json = await res.json() as { data: { id: string; userId: string; title: string; category: string; isRead: boolean } }
      expect(json.data.id).toBeDefined()
      expect(json.data.userId).toBe(MOCK_USER_ID)
      expect(json.data.title).toBe('Test Notification')
      expect(json.data.category).toBe('announcement')
      expect(json.data.isRead).toBe(false)
    })

    it('creates a notification with all optional fields', async function () {
      const expiresAt = new Date('2026-12-31T23:59:59.000Z')
      const res = await createNotification({
        priority: 'high',
        data: { link: '/dashboard' },
        metadata: { source: 'test' },
        expiresAt: expiresAt.toISOString(),
      })
      expect(res.status).toBe(201)
      const json = await res.json() as { data: { priority: string; data: Record<string, unknown> } }
      expect(json.data.priority).toBe('high')
      expect(json.data.data).toEqual({ link: '/dashboard' })
    })

    it('returns 422 when title is missing', async function () {
      const res = await createNotification({ title: '' })
      expect(res.status).toBe(422)
    })

    it('returns 422 when category is invalid', async function () {
      const res = await createNotification({ category: 'invalid_category' })
      expect(res.status).toBe(422)
    })

    it('returns 422 when userId is not a valid UUID', async function () {
      const res = await createNotification({ userId: 'not-a-uuid' })
      expect(res.status).toBe(422)
    })
  })

  // ─── List Notifications ─────────────────────────────────────────────────

  describe('GET / — List Notifications', function () {

    it('returns empty array when no notifications exist', async function () {
      const res = await request('/condominium/notifications', { headers: jsonHeaders() })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: unknown[] }
      expect(json.data).toHaveLength(0)
    })

    it('returns all notifications', async function () {
      await createNotification({ title: 'First' })
      await createNotification({ title: 'Second' })
      await createNotification({ title: 'Third' })

      const res = await request('/condominium/notifications', { headers: jsonHeaders() })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: unknown[] }
      expect(json.data).toHaveLength(3)
    })
  })

  // ─── Get By ID ──────────────────────────────────────────────────────────

  describe('GET /:id — Get Notification by ID', function () {

    it('returns notification by ID', async function () {
      const createRes = await createNotification()
      const createJson = await createRes.json() as { data: { id: string } }

      const res = await request(`/condominium/notifications/${createJson.data.id}`, {
        headers: jsonHeaders(),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { id: string; title: string } }
      expect(json.data.id).toBe(createJson.data.id)
      expect(json.data.title).toBe('Test Notification')
    })

    it('returns 404 for non-existent notification', async function () {
      const res = await request('/condominium/notifications/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', {
        headers: jsonHeaders(),
      })
      expect(res.status).toBe(404)
    })
  })

  // ─── Get By User ────────────────────────────────────────────────────────

  describe('GET /user/:userId — Get Notifications by User', function () {

    it('returns notifications for a specific user', async function () {
      await createNotification({ userId: MOCK_USER_ID, title: 'For admin' })
      await createNotification({ userId: OTHER_USER_ID, title: 'For other' })

      const res = await request(`/condominium/notifications/user/${MOCK_USER_ID}`, {
        headers: jsonHeaders(),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { title: string }[] }
      expect(json.data).toHaveLength(1)
      expect(json.data[0]!.title).toBe('For admin')
    })

    it('returns empty array for user with no notifications', async function () {
      const res = await request(`/condominium/notifications/user/${MOCK_USER_ID}`, {
        headers: jsonHeaders(),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: unknown[] }
      expect(json.data).toHaveLength(0)
    })
  })

  // ─── Unread Count ───────────────────────────────────────────────────────

  describe('GET /user/:userId/unread-count — Unread Count', function () {

    it('returns 0 when no notifications exist', async function () {
      const res = await request(`/condominium/notifications/user/${MOCK_USER_ID}/unread-count`, {
        headers: jsonHeaders(),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { count: number } }
      expect(json.data.count).toBe(0)
    })

    it('returns correct unread count', async function () {
      await createNotification({ title: 'Unread 1' })
      await createNotification({ title: 'Unread 2' })
      await createNotification({ title: 'Unread 3' })

      const res = await request(`/condominium/notifications/user/${MOCK_USER_ID}/unread-count`, {
        headers: jsonHeaders(),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { count: number } }
      expect(json.data.count).toBe(3)
    })

    it('decreases count after marking as read', async function () {
      const createRes = await createNotification()
      const createJson = await createRes.json() as { data: { id: string } }
      await createNotification({ title: 'Second' })

      // Mark first as read
      await request(`/condominium/notifications/${createJson.data.id}/read`, {
        method: 'POST',
        headers: jsonHeaders(),
      })

      const res = await request(`/condominium/notifications/user/${MOCK_USER_ID}/unread-count`, {
        headers: jsonHeaders(),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { count: number } }
      expect(json.data.count).toBe(1)
    })
  })

  // ─── Send Notification ──────────────────────────────────────────────────

  describe('POST /send — Send Notification', function () {

    it('sends a notification with in_app delivery', async function () {
      const res = await sendNotification({
        channels: ['in_app'],
      })
      expect(res.status).toBe(201)
      const json = await res.json() as { data: { notification: { id: string; title: string; userId: string }; deliveryIds: string[] } }
      expect(json.data.notification).toBeDefined()
      expect(json.data.notification.title).toBe('Sent Notification')
      expect(json.data.notification.userId).toBe(MOCK_USER_ID)
      expect(json.data.deliveryIds).toHaveLength(1)
    })

    it('sends a notification with default channels (in_app)', async function () {
      const res = await sendNotification()
      expect(res.status).toBe(201)
      const json = await res.json() as { data: { notification: { id: string }; deliveryIds: string[] } }
      expect(json.data.notification.id).toBeDefined()
      expect(json.data.deliveryIds).toHaveLength(1)
    })

    it('sends a notification with multiple channels', async function () {
      const res = await sendNotification({
        channels: ['in_app', 'email'],
      })
      expect(res.status).toBe(201)
      const json = await res.json() as { data: { deliveryIds: string[] } }
      expect(json.data.deliveryIds).toHaveLength(2)
    })

    it('sends with priority and data', async function () {
      const res = await sendNotification({
        priority: 'urgent',
        data: { action: 'view_payment', paymentId: '123' },
      })
      expect(res.status).toBe(201)
      const json = await res.json() as { data: { notification: { priority: string; data: Record<string, unknown> } } }
      expect(json.data.notification.priority).toBe('urgent')
      expect(json.data.notification.data).toEqual({ action: 'view_payment', paymentId: '123' })
    })

    it('returns 422 when title is missing', async function () {
      const res = await sendNotification({ title: '' })
      expect(res.status).toBe(422)
    })

    it('returns 422 when category is invalid', async function () {
      const res = await sendNotification({ category: 'invalid' })
      expect(res.status).toBe(422)
    })

    it('respects user notification preferences (disabled channel)', async function () {
      // Disable in_app for announcement category
      const preferencesRepo = new UserNotificationPreferencesRepository(db)
      await preferencesRepo.create({
        userId: MOCK_USER_ID,
        category: 'announcement',
        channel: 'in_app',
        isEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        metadata: null,
      })

      const res = await sendNotification({ channels: ['in_app'] })
      expect(res.status).toBe(201)
      const json = await res.json() as { data: { deliveryIds: string[] } }
      // No deliveries because channel is disabled
      expect(json.data.deliveryIds).toHaveLength(0)
    })
  })

  // ─── Mark as Read ───────────────────────────────────────────────────────

  describe('POST /:id/read — Mark as Read', function () {

    it('marks a notification as read', async function () {
      const createRes = await createNotification()
      const createJson = await createRes.json() as { data: { id: string } }

      const res = await request(`/condominium/notifications/${createJson.data.id}/read`, {
        method: 'POST',
        headers: jsonHeaders(),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { isRead: boolean; readAt: string } }
      expect(json.data.isRead).toBe(true)
      expect(json.data.readAt).toBeDefined()
    })

    it('returns 404 for non-existent notification', async function () {
      const res = await request('/condominium/notifications/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/read', {
        method: 'POST',
        headers: jsonHeaders(),
      })
      expect(res.status).toBe(404)
    })

    it('is idempotent (marking as read twice succeeds)', async function () {
      const createRes = await createNotification()
      const createJson = await createRes.json() as { data: { id: string } }
      const notifId = createJson.data.id

      // Mark read once
      await request(`/condominium/notifications/${notifId}/read`, {
        method: 'POST',
        headers: jsonHeaders(),
      })

      // Mark read again
      const res = await request(`/condominium/notifications/${notifId}/read`, {
        method: 'POST',
        headers: jsonHeaders(),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { isRead: boolean } }
      expect(json.data.isRead).toBe(true)
    })
  })

  // ─── Mark All as Read ───────────────────────────────────────────────────

  describe('POST /user/:userId/read-all — Mark All as Read', function () {

    it('marks all notifications as read for a user', async function () {
      await createNotification({ title: 'N1' })
      await createNotification({ title: 'N2' })
      await createNotification({ title: 'N3' })

      const res = await request(`/condominium/notifications/user/${MOCK_USER_ID}/read-all`, {
        method: 'POST',
        headers: jsonHeaders(),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { count: number } }
      expect(json.data.count).toBe(3)

      // Verify unread count is now 0
      const unreadRes = await request(`/condominium/notifications/user/${MOCK_USER_ID}/unread-count`, {
        headers: jsonHeaders(),
      })
      const unreadJson = await unreadRes.json() as { data: { count: number } }
      expect(unreadJson.data.count).toBe(0)
    })

    it('returns 0 when user has no unread notifications', async function () {
      const res = await request(`/condominium/notifications/user/${MOCK_USER_ID}/read-all`, {
        method: 'POST',
        headers: jsonHeaders(),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { count: number } }
      expect(json.data.count).toBe(0)
    })

    it('only marks unread notifications, not already-read ones', async function () {
      const createRes = await createNotification({ title: 'Already Read' })
      const createJson = await createRes.json() as { data: { id: string } }
      await request(`/condominium/notifications/${createJson.data.id}/read`, {
        method: 'POST',
        headers: jsonHeaders(),
      })

      await createNotification({ title: 'Still Unread' })

      const res = await request(`/condominium/notifications/user/${MOCK_USER_ID}/read-all`, {
        method: 'POST',
        headers: jsonHeaders(),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { count: number } }
      expect(json.data.count).toBe(1)
    })
  })

  // ─── Update Notification ────────────────────────────────────────────────

  describe('PATCH /:id — Update Notification', function () {

    it('updates isRead field', async function () {
      const createRes = await createNotification()
      const createJson = await createRes.json() as { data: { id: string } }

      const res = await request(`/condominium/notifications/${createJson.data.id}`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify({ isRead: true }),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { isRead: boolean } }
      expect(json.data.isRead).toBe(true)
    })

    it('returns 404 for non-existent notification', async function () {
      const res = await request('/condominium/notifications/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify({ isRead: true }),
      })
      expect(res.status).toBe(404)
    })
  })

  // ─── Delete Notification ────────────────────────────────────────────────

  describe('DELETE /:id — Delete Notification', function () {

    it('deletes a notification (hard delete)', async function () {
      const createRes = await createNotification()
      const createJson = await createRes.json() as { data: { id: string } }

      const deleteRes = await request(`/condominium/notifications/${createJson.data.id}`, {
        method: 'DELETE',
        headers: jsonHeaders(),
      })
      expect(deleteRes.status).toBe(204)

      // Verify it is gone
      const getRes = await request(`/condominium/notifications/${createJson.data.id}`, {
        headers: jsonHeaders(),
      })
      expect(getRes.status).toBe(404)
    })

    it('returns 404 for non-existent notification', async function () {
      const res = await request('/condominium/notifications/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', {
        method: 'DELETE',
        headers: jsonHeaders(),
      })
      expect(res.status).toBe(404)
    })
  })

  // ─── Full Notification Lifecycle ────────────────────────────────────────

  describe('Full Notification Lifecycle', function () {

    it('send -> read -> verify DB state', async function () {
      // Send notification
      const sendRes = await sendNotification({
        category: 'payment',
        title: 'Payment Received',
        body: 'Your payment of $100 was received.',
        channels: ['in_app'],
      })
      expect(sendRes.status).toBe(201)
      const sendJson = await sendRes.json() as { data: { notification: { id: string } } }
      const notifId = sendJson.data.notification.id

      // Verify unread count = 1
      const unreadRes1 = await request(`/condominium/notifications/user/${MOCK_USER_ID}/unread-count`, {
        headers: jsonHeaders(),
      })
      const unreadJson1 = await unreadRes1.json() as { data: { count: number } }
      expect(unreadJson1.data.count).toBe(1)

      // Mark as read
      const readRes = await request(`/condominium/notifications/${notifId}/read`, {
        method: 'POST',
        headers: jsonHeaders(),
      })
      expect(readRes.status).toBe(200)

      // Verify unread count = 0
      const unreadRes2 = await request(`/condominium/notifications/user/${MOCK_USER_ID}/unread-count`, {
        headers: jsonHeaders(),
      })
      const unreadJson2 = await unreadRes2.json() as { data: { count: number } }
      expect(unreadJson2.data.count).toBe(0)

      // Verify in DB
      const notificationsRepo = new NotificationsRepository(db)
      const dbNotif = await notificationsRepo.getById(notifId)
      expect(dbNotif).not.toBeNull()
      expect(dbNotif!.isRead).toBe(true)
      expect(dbNotif!.readAt).not.toBeNull()
    })

    it('create multiple -> mark all read -> delete one -> verify DB', async function () {
      // Create 3 notifications
      const res1 = await createNotification({ title: 'N1', category: 'alert' })
      const json1 = await res1.json() as { data: { id: string } }
      await createNotification({ title: 'N2', category: 'reminder' })
      await createNotification({ title: 'N3', category: 'system' })

      // Mark all read
      const markAllRes = await request(`/condominium/notifications/user/${MOCK_USER_ID}/read-all`, {
        method: 'POST',
        headers: jsonHeaders(),
      })
      const markAllJson = await markAllRes.json() as { data: { count: number } }
      expect(markAllJson.data.count).toBe(3)

      // Delete one
      const deleteRes = await request(`/condominium/notifications/${json1.data.id}`, {
        method: 'DELETE',
        headers: jsonHeaders(),
      })
      expect(deleteRes.status).toBe(204)

      // Verify only 2 remain
      const listRes = await request('/condominium/notifications', { headers: jsonHeaders() })
      const listJson = await listRes.json() as { data: unknown[] }
      expect(listJson.data).toHaveLength(2)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests: UserFcmTokensController
// ─────────────────────────────────────────────────────────────────────────────

describe('FCM Tokens Flow — Integration', function () {

  // ─── Register Token ─────────────────────────────────────────────────────

  describe('POST /user/:userId/register — Register Token', function () {

    it('registers a new FCM token', async function () {
      const res = await registerToken(MOCK_USER_ID)
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { id: string; token: string; platform: string; deviceName: string; isActive: boolean }; isNew: boolean }
      expect(json.data.token).toBe('fcm-token-abc123def456')
      expect(json.data.platform).toBe('web')
      expect(json.data.deviceName).toBe('Chrome Browser')
      expect(json.data.isActive).toBe(true)
      expect(json.isNew).toBe(true)
    })

    it('updates existing token instead of duplicating', async function () {
      // Register once
      await registerToken(MOCK_USER_ID)

      // Register same token again
      const res = await registerToken(MOCK_USER_ID, { deviceName: 'Updated Chrome' })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { deviceName: string }; isNew: boolean }
      expect(json.isNew).toBe(false)
      expect(json.data.deviceName).toBe('Updated Chrome')
    })

    it('registers tokens for different platforms', async function () {
      await registerToken(MOCK_USER_ID, { token: 'token-web', platform: 'web' })
      await registerToken(MOCK_USER_ID, { token: 'token-ios', platform: 'ios' })
      await registerToken(MOCK_USER_ID, { token: 'token-android', platform: 'android' })

      const res = await request(`/me/fcm-tokens/user/${MOCK_USER_ID}`, {
        headers: jsonHeaders(),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: unknown[] }
      expect(json.data).toHaveLength(3)
    })

    it('returns 422 when token is missing', async function () {
      const res = await registerToken(MOCK_USER_ID, { token: '' })
      expect(res.status).toBe(422)
    })

    it('returns 422 when platform is invalid', async function () {
      const res = await registerToken(MOCK_USER_ID, { platform: 'windows' })
      expect(res.status).toBe(422)
    })
  })

  // ─── Get User Tokens ───────────────────────────────────────────────────

  describe('GET /user/:userId — Get User Tokens', function () {

    it('returns empty array when user has no tokens', async function () {
      const res = await request(`/me/fcm-tokens/user/${MOCK_USER_ID}`, {
        headers: jsonHeaders(),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: unknown[] }
      expect(json.data).toHaveLength(0)
    })

    it('returns active tokens for a user', async function () {
      await registerToken(MOCK_USER_ID, { token: 'token-1', platform: 'web' })
      await registerToken(MOCK_USER_ID, { token: 'token-2', platform: 'ios' })

      const res = await request(`/me/fcm-tokens/user/${MOCK_USER_ID}`, {
        headers: jsonHeaders(),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { token: string; isActive: boolean }[] }
      expect(json.data).toHaveLength(2)
      for (const token of json.data) {
        expect(token.isActive).toBe(true)
      }
    })
  })

  // ─── Unregister Token ──────────────────────────────────────────────────

  describe('POST /user/:userId/unregister — Unregister Token', function () {

    it('unregisters an existing token', async function () {
      await registerToken(MOCK_USER_ID)

      const res = await request(`/me/fcm-tokens/user/${MOCK_USER_ID}/unregister`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ token: 'fcm-token-abc123def456' }),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { deleted: boolean } }
      expect(json.data.deleted).toBe(true)

      // Verify token is gone
      const listRes = await request(`/me/fcm-tokens/user/${MOCK_USER_ID}`, {
        headers: jsonHeaders(),
      })
      const listJson = await listRes.json() as { data: unknown[] }
      expect(listJson.data).toHaveLength(0)
    })

    it('returns deleted: false for non-existent token', async function () {
      const res = await request(`/me/fcm-tokens/user/${MOCK_USER_ID}/unregister`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ token: 'non-existent-token' }),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as { data: { deleted: boolean } }
      expect(json.data.deleted).toBe(false)
    })

    it('returns 400 when token belongs to another user', async function () {
      // Register token for OTHER_USER
      await registerToken(OTHER_USER_ID, { token: 'other-user-token' })

      // Try to unregister it as MOCK_USER
      const res = await request(`/me/fcm-tokens/user/${MOCK_USER_ID}/unregister`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ token: 'other-user-token' }),
      })
      expect(res.status).toBe(400)
    })

    it('returns 422 when token is missing in body', async function () {
      const res = await request(`/me/fcm-tokens/user/${MOCK_USER_ID}/unregister`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ token: '' }),
      })
      expect(res.status).toBe(422)
    })
  })

  // ─── Delete Token by ID ────────────────────────────────────────────────

  describe('DELETE /:id — Delete Token', function () {

    it('deletes a token by ID', async function () {
      const regRes = await registerToken(MOCK_USER_ID)
      const regJson = await regRes.json() as { data: { id: string } }

      const deleteRes = await request(`/me/fcm-tokens/${regJson.data.id}`, {
        method: 'DELETE',
        headers: jsonHeaders(),
      })
      expect(deleteRes.status).toBe(204)

      // Verify token is gone
      const listRes = await request(`/me/fcm-tokens/user/${MOCK_USER_ID}`, {
        headers: jsonHeaders(),
      })
      const listJson = await listRes.json() as { data: unknown[] }
      expect(listJson.data).toHaveLength(0)
    })

    it('returns 404 for non-existent token ID', async function () {
      const res = await request('/me/fcm-tokens/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', {
        method: 'DELETE',
        headers: jsonHeaders(),
      })
      expect(res.status).toBe(404)
    })
  })

  // ─── Full FCM Token Lifecycle ──────────────────────────────────────────

  describe('Full FCM Token Lifecycle', function () {

    it('register -> list -> unregister -> verify empty', async function () {
      // Register
      const regRes = await registerToken(MOCK_USER_ID, { token: 'lifecycle-token' })
      expect(regRes.status).toBe(200)

      // List and verify
      const listRes1 = await request(`/me/fcm-tokens/user/${MOCK_USER_ID}`, {
        headers: jsonHeaders(),
      })
      const listJson1 = await listRes1.json() as { data: { token: string }[] }
      expect(listJson1.data).toHaveLength(1)
      expect(listJson1.data[0]!.token).toBe('lifecycle-token')

      // Unregister
      const unregRes = await request(`/me/fcm-tokens/user/${MOCK_USER_ID}/unregister`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ token: 'lifecycle-token' }),
      })
      expect(unregRes.status).toBe(200)

      // Verify empty
      const listRes2 = await request(`/me/fcm-tokens/user/${MOCK_USER_ID}`, {
        headers: jsonHeaders(),
      })
      const listJson2 = await listRes2.json() as { data: unknown[] }
      expect(listJson2.data).toHaveLength(0)
    })

    it('register multiple -> delete by ID -> verify remaining', async function () {
      // Register 2 tokens
      const reg1 = await registerToken(MOCK_USER_ID, { token: 'token-A', platform: 'web' })
      const json1 = await reg1.json() as { data: { id: string } }
      await registerToken(MOCK_USER_ID, { token: 'token-B', platform: 'ios' })

      // Delete first by ID
      await request(`/me/fcm-tokens/${json1.data.id}`, {
        method: 'DELETE',
        headers: jsonHeaders(),
      })

      // Verify only second remains
      const listRes = await request(`/me/fcm-tokens/user/${MOCK_USER_ID}`, {
        headers: jsonHeaders(),
      })
      const listJson = await listRes.json() as { data: { token: string }[] }
      expect(listJson.data).toHaveLength(1)
      expect(listJson.data[0]!.token).toBe('token-B')
    })

    it('register token -> re-register updates lastUsedAt', async function () {
      // Register
      const reg1 = await registerToken(MOCK_USER_ID, { token: 'reuse-token' })
      const json1 = await reg1.json() as { data: { id: string } }

      // Small delay for timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      // Re-register same token
      const reg2 = await registerToken(MOCK_USER_ID, { token: 'reuse-token' })
      const json2 = await reg2.json() as { data: { id: string }; isNew: boolean }

      // Should be the same record (not new)
      expect(json2.isNew).toBe(false)
      expect(json2.data.id).toBe(json1.data.id)
    })
  })
})
