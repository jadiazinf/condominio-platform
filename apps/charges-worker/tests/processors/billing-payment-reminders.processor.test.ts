import { describe, it, expect, beforeEach } from 'bun:test'
import {
  getReminderTier,
  getReminderContent,
  executePaymentReminders,
  type IRemindersDeps,
  type TReminderTier,
} from '@worker/processors/billing-payment-reminders.processor'

// ─── Unit tests: getReminderTier ───

describe('getReminderTier', () => {
  it('returns pre_due_3 when 3 days before due', () => {
    expect(getReminderTier('2026-04-05', '2026-04-02')).toBe('pre_due_3')
  })

  it('returns due_today on exact due date', () => {
    expect(getReminderTier('2026-04-02', '2026-04-02')).toBe('due_today')
  })

  it('returns overdue_week within first 7 days overdue', () => {
    expect(getReminderTier('2026-04-01', '2026-04-02')).toBe('overdue_week')
    expect(getReminderTier('2026-04-01', '2026-04-07')).toBe('overdue_week')
    expect(getReminderTier('2026-04-01', '2026-04-08')).toBe('overdue_week')
  })

  it('returns legal_collection at 60+ days overdue', () => {
    expect(getReminderTier('2026-01-01', '2026-04-02')).toBe('legal_collection')
    expect(getReminderTier('2026-02-01', '2026-04-02')).toBe('legal_collection')
  })

  it('returns null for non-reminder days', () => {
    // 5 days before
    expect(getReminderTier('2026-04-07', '2026-04-02')).toBeNull()
    // 1 day before
    expect(getReminderTier('2026-04-03', '2026-04-02')).toBeNull()
    // 2 days before
    expect(getReminderTier('2026-04-04', '2026-04-02')).toBeNull()
    // 15 days overdue (between week and 60)
    expect(getReminderTier('2026-03-18', '2026-04-02')).toBeNull()
    // 30 days overdue
    expect(getReminderTier('2026-03-03', '2026-04-02')).toBeNull()
  })
})

// ─── Unit tests: getReminderContent ───

describe('getReminderContent', () => {
  it('returns reminder content for pre_due_3', () => {
    const content = getReminderContent('pre_due_3', 'REC-001', '2026-04-05')
    expect(content).not.toBeNull()
    expect(content!.category).toBe('reminder')
    expect(content!.title).toContain('por vencer')
    expect(content!.body).toContain('REC-001')
  })

  it('returns alert content for overdue_week', () => {
    const content = getReminderContent('overdue_week', 'REC-001', '2026-04-01')
    expect(content).not.toBeNull()
    expect(content!.category).toBe('alert')
    expect(content!.title).toContain('vencido')
  })

  it('returns null for legal_collection (no notification to resident)', () => {
    const content = getReminderContent('legal_collection', 'REC-001', '2026-01-01')
    expect(content).toBeNull()
  })

  it('returns null for null tier', () => {
    const content = getReminderContent(null, 'REC-001', '2026-04-05')
    expect(content).toBeNull()
  })
})

// ─── Integration: executePaymentReminders ───

function mockReceipt(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    condominiumId: 'condo-1',
    unitId: 'unit-1',
    receiptNumber: `REC-${id}`,
    status: 'issued',
    dueDate: '2026-04-05',
    totalAmount: '100.00',
    ...overrides,
  }
}

function createMockDeps(
  _channels: any[] = [],
  receipts: any[] = [],
  ownerships: any[] = []
): IRemindersDeps & { sentNotifications: any[] } {
  const sentNotifications: any[] = []
  return {
    receiptsRepo: { listAll: async () => receipts },
    ownershipsRepo: {
      getRegisteredByUnitIds: async () => ownerships,
    },
    sendNotification: async (data) => { sentNotifications.push(data) },
    sentNotifications,
  }
}

describe('executePaymentReminders', () => {
  // ─── Happy paths ───

  it('sends reminders for receipts due in 3 days', async () => {
    const deps = createMockDeps(
      [{ id: 'ch-1', isActive: true }],
      [mockReceipt('r1', { dueDate: '2026-04-05' })],
      [{ userId: 'user-1' }]
    )

    const result = await executePaymentReminders(deps, '2026-04-02')

    expect(result.remindersSent).toBe(1)
    expect(deps.sentNotifications[0].title).toContain('por vencer')
  })

  it('sends reminders for receipts due today', async () => {
    const deps = createMockDeps(
      [{ id: 'ch-1', isActive: true }],
      [mockReceipt('r1', { dueDate: '2026-04-02' })],
      [{ userId: 'user-1' }]
    )

    const result = await executePaymentReminders(deps, '2026-04-02')

    expect(result.remindersSent).toBe(1)
    expect(deps.sentNotifications[0].title).toContain('vence hoy')
  })

  it('sends alert for overdue receipts', async () => {
    const deps = createMockDeps(
      [{ id: 'ch-1', isActive: true }],
      [mockReceipt('r1', { dueDate: '2026-03-30' })],
      [{ userId: 'user-1' }]
    )

    const result = await executePaymentReminders(deps, '2026-04-02')

    expect(result.remindersSent).toBe(1)
    expect(deps.sentNotifications[0].category).toBe('alert')
  })

  it('sends to multiple owners of same unit', async () => {
    const deps = createMockDeps(
      [{ id: 'ch-1', isActive: true }],
      [mockReceipt('r1', { dueDate: '2026-04-05' })],
      [{ userId: 'user-1' }, { userId: 'user-2' }]
    )

    const result = await executePaymentReminders(deps, '2026-04-02')

    expect(result.remindersSent).toBe(2)
  })

  // ─── Filtering ───

  it('skips paid receipts', async () => {
    const deps = createMockDeps(
      [{ id: 'ch-1', isActive: true }],
      [mockReceipt('r1', { status: 'paid', dueDate: '2026-04-05' })],
      [{ userId: 'user-1' }]
    )

    const result = await executePaymentReminders(deps, '2026-04-02')

    expect(result.remindersSent).toBe(0)
  })

  it('skips voided receipts', async () => {
    const deps = createMockDeps(
      [{ id: 'ch-1', isActive: true }],
      [mockReceipt('r1', { status: 'voided', dueDate: '2026-04-05' })],
      [{ userId: 'user-1' }]
    )

    const result = await executePaymentReminders(deps, '2026-04-02')

    expect(result.remindersSent).toBe(0)
  })

  it('skips receipts without dueDate', async () => {
    const deps = createMockDeps(
      [{ id: 'ch-1', isActive: true }],
      [mockReceipt('r1', { dueDate: null })],
      [{ userId: 'user-1' }]
    )

    const result = await executePaymentReminders(deps, '2026-04-02')

    expect(result.remindersSent).toBe(0)
  })

  it('skips ownerships without userId', async () => {
    const deps = createMockDeps(
      [{ id: 'ch-1', isActive: true }],
      [mockReceipt('r1', { dueDate: '2026-04-05' })],
      [{ userId: null }]
    )

    const result = await executePaymentReminders(deps, '2026-04-02')

    expect(result.remindersSent).toBe(0)
  })

  it('counts legal collection warnings without sending notifications', async () => {
    const deps = createMockDeps(
      [{ id: 'ch-1', isActive: true }],
      [mockReceipt('r1', { dueDate: '2026-01-01' })], // 90+ days overdue
      [{ userId: 'user-1' }]
    )

    const result = await executePaymentReminders(deps, '2026-04-02')

    expect(result.remindersSent).toBe(0)
    expect(result.legalCollectionWarnings).toBe(1)
    expect(deps.sentNotifications).toHaveLength(0)
  })

  // ─── Error handling ───

  it('counts errors when sendNotification fails', async () => {
    const deps = createMockDeps(
      [{ id: 'ch-1', isActive: true }],
      [mockReceipt('r1', { dueDate: '2026-04-05' })],
      [{ userId: 'user-1' }]
    )
    deps.sendNotification = async () => { throw new Error('Queue down') }

    const result = await executePaymentReminders(deps, '2026-04-02')

    expect(result.errors).toBe(1)
    expect(result.remindersSent).toBe(0)
  })

  it('counts error when receipts fetch fails', async () => {
    const deps = createMockDeps(
      [],
      [],
      [{ userId: 'user-1' }]
    )
    deps.receiptsRepo.listAll = async () => { throw new Error('DB error') }

    const result = await executePaymentReminders(deps, '2026-04-02')

    expect(result.errors).toBe(1)
    expect(result.remindersSent).toBe(0)
  })

  // ─── Edge cases ───

  it('handles no receipts', async () => {
    const deps = createMockDeps([], [], [])

    const result = await executePaymentReminders(deps, '2026-04-02')

    expect(result.remindersSent).toBe(0)
    expect(result.errors).toBe(0)
  })

  it('handles partial receipt status', async () => {
    const deps = createMockDeps(
      [{ id: 'ch-1', isActive: true }],
      [mockReceipt('r1', { status: 'partial', dueDate: '2026-04-05' })],
      [{ userId: 'user-1' }]
    )

    const result = await executePaymentReminders(deps, '2026-04-02')

    expect(result.remindersSent).toBe(1) // partial receipts get reminders too
  })

  it('includes receipt data in notification', async () => {
    const deps = createMockDeps(
      [{ id: 'ch-1', isActive: true }],
      [mockReceipt('r1', { dueDate: '2026-04-05', totalAmount: '250.00' })],
      [{ userId: 'user-1' }]
    )

    await executePaymentReminders(deps, '2026-04-02')

    expect(deps.sentNotifications[0].data.receiptId).toBe('r1')
    expect(deps.sentNotifications[0].data.totalAmount).toBe('250.00')
    expect(deps.sentNotifications[0].channels).toContain('push')
  })
})
