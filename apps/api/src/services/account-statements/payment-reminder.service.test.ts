import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { PaymentReminderService } from './payment-reminder.service'

// ─────────────────────────────────────────────────────────────────────────────
// Mock helpers
// ─────────────────────────────────────────────────────────────────────────────

function createQuota(dueDate: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `quota-${dueDate}`,
    unitId: 'unit-1',
    paymentConceptId: 'concept-1',
    periodYear: 2026,
    periodMonth: Number(dueDate.slice(5, 7)),
    periodDescription: `Period ${dueDate}`,
    baseAmount: '1000.00',
    currencyId: 'currency-1',
    interestAmount: '0',
    amountInBaseCurrency: null,
    exchangeRateUsed: null,
    issueDate: dueDate.replace(/\d{2}$/, '01'),
    dueDate,
    status: 'pending',
    adjustmentsTotal: '0',
    paidAmount: '0',
    balance: '1000.00',
    notes: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────

describe('PaymentReminderService', () => {
  let service: PaymentReminderService
  let mockQuotasRepo: Record<string, ReturnType<typeof mock>>
  let mockOwnershipsRepo: Record<string, ReturnType<typeof mock>>

  const defaultInput = {
    condominiumId: 'condo-1',
    asOfDate: '2026-03-20',
  }

  /** Helper: sets quotas for current year, empty for prev year */
  function setQuotas(quotas: ReturnType<typeof createQuota>[]) {
    let callCount = 0
    mockQuotasRepo.getByPeriod!.mockImplementation(() => {
      callCount++
      return callCount === 1 ? quotas : [] // first call = current year, second = prev year
    })
  }

  beforeEach(() => {
    mockQuotasRepo = {
      getByPeriod: mock(() => []),
    }
    mockOwnershipsRepo = {
      listByCondominiumId: mock(() => [
        { unitId: 'unit-1', userId: 'user-1' },
        { unitId: 'unit-2', userId: 'user-2' },
      ]),
    }

    service = new PaymentReminderService(mockQuotasRepo as never, mockOwnershipsRepo as never)
  })

  // ─── Empty state ─────────────────────────────────────────────────────────

  it('returns empty when no unpaid quotas', async () => {
    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.candidates).toHaveLength(0)
      expect(result.data.totalCandidates).toBe(0)
    }
  })

  // ─── Pre-due reminder (5 days before) ────────────────────────────────────

  it('identifies pre_due_5 reminder for quota due in 5 days', async () => {
    // asOfDate=Mar 20, dueDate=Mar 25 → 5 days before = pre_due_5
    setQuotas([createQuota('2026-03-25')])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.candidates).toHaveLength(1)
      expect(result.data.candidates[0]!.reminderType).toBe('pre_due_5')
      expect(result.data.candidates[0]!.daysRelativeToDue).toBe(-5)
    }
  })

  // ─── Due today ───────────────────────────────────────────────────────────

  it('identifies due_today reminder for quota due today', async () => {
    setQuotas([createQuota('2026-03-20')])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.candidates).toHaveLength(1)
      expect(result.data.candidates[0]!.reminderType).toBe('due_today')
    }
  })

  // ─── Overdue reminders ───────────────────────────────────────────────────

  it('identifies overdue_5 reminder for quota 5 days past due', async () => {
    setQuotas([createQuota('2026-03-15', { status: 'overdue' })])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.candidates).toHaveLength(1)
      expect(result.data.candidates[0]!.reminderType).toBe('overdue_5')
    }
  })

  it('identifies overdue_15 reminder for quota 15 days past due', async () => {
    setQuotas([createQuota('2026-03-05', { status: 'overdue' })])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.candidates).toHaveLength(1)
      expect(result.data.candidates[0]!.reminderType).toBe('overdue_15')
    }
  })

  it('identifies overdue_30 reminder for quota 30 days past due', async () => {
    setQuotas([createQuota('2026-02-18', { status: 'overdue' })])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.candidates).toHaveLength(1)
      expect(result.data.candidates[0]!.reminderType).toBe('overdue_30')
    }
  })

  // ─── No reminder for non-matching days ───────────────────────────────────

  it('does not generate reminder for quotas on non-matching days', async () => {
    // asOfDate=Mar 20, dueDate=Mar 10 → 10 days overdue (not 5, 15, or 30)
    setQuotas([createQuota('2026-03-10', { status: 'overdue' })])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.candidates).toHaveLength(0)
    }
  })

  // ─── Paid quotas excluded ────────────────────────────────────────────────

  it('excludes paid quotas from reminders', async () => {
    setQuotas([createQuota('2026-03-20', { status: 'paid', balance: '0', paidAmount: '1000.00' })])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.candidates).toHaveLength(0)
    }
  })

  // ─── Units without owner excluded ────────────────────────────────────────

  it('excludes quotas for units with no known owner', async () => {
    setQuotas([createQuota('2026-03-20', { unitId: 'unit-unknown' })])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.candidates).toHaveLength(0)
    }
  })

  // ─── Multiple quotas, multiple units ─────────────────────────────────────

  it('handles multiple quotas across units', async () => {
    setQuotas([
      createQuota('2026-03-25', { unitId: 'unit-1' }), // pre_due_5
      createQuota('2026-03-20', { unitId: 'unit-2' }), // due_today
      createQuota('2026-03-10', { unitId: 'unit-1', status: 'overdue' }), // 10 days → no match
    ])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.candidates).toHaveLength(2)
      const types = result.data.candidates.map(c => c.reminderType)
      expect(types).toContain('pre_due_5')
      expect(types).toContain('due_today')
    }
  })

  // ─── Partial payment still gets reminder ─────────────────────────────────

  it('sends reminder for partially paid quotas', async () => {
    setQuotas([
      createQuota('2026-03-20', {
        status: 'partial',
        paidAmount: '500.00',
        balance: '500.00',
      }),
    ])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.candidates).toHaveLength(1)
      expect(result.data.candidates[0]!.balance).toBe('500.00')
    }
  })
})
