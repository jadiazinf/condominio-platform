import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { GetUnitAccountStatementService } from './get-unit-account-statement.service'

// ─────────────────────────────────────────────────────────────────────────────
// Mock helpers
// ─────────────────────────────────────────────────────────────────────────────

function createMockQuota(overrides: Record<string, unknown> = {}) {
  return {
    id: 'quota-1',
    unitId: 'unit-1',
    paymentConceptId: 'concept-1',
    periodYear: 2026,
    periodMonth: 3,
    periodDescription: 'March 2026',
    baseAmount: '1000.00',
    currencyId: 'currency-1',
    interestAmount: '0',
    amountInBaseCurrency: null,
    exchangeRateUsed: null,
    issueDate: '2026-03-01',
    dueDate: '2026-03-15',
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

function createMockPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'payment-1',
    paymentNumber: null,
    userId: 'user-1',
    unitId: 'unit-1',
    amount: '500.00',
    currencyId: 'currency-1',
    paidAmount: null,
    paidCurrencyId: null,
    exchangeRate: null,
    paymentMethod: 'transfer',
    paymentGatewayId: null,
    paymentDetails: null,
    paymentDate: '2026-03-10',
    registeredAt: new Date(),
    status: 'completed',
    receiptUrl: null,
    receiptNumber: 'REF-001',
    notes: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    registeredBy: 'user-1',
    verifiedBy: null,
    verifiedAt: null,
    verificationNotes: null,
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────

describe('GetUnitAccountStatementService', () => {
  let service: GetUnitAccountStatementService
  let mockQuotasRepo: Record<string, ReturnType<typeof mock>>
  let mockPaymentsRepo: Record<string, ReturnType<typeof mock>>
  let mockApplicationsRepo: Record<string, ReturnType<typeof mock>>
  let mockUnitsRepo: Record<string, ReturnType<typeof mock>>

  const defaultInput = {
    unitId: 'unit-1',
    from: '2026-03-01',
    to: '2026-03-31',
  }

  beforeEach(() => {
    mockQuotasRepo = {
      getByUnitId: mock(() => []),
    }
    mockPaymentsRepo = {
      getByUnitId: mock(() => []),
    }
    mockApplicationsRepo = {
      getByPaymentIdsWithRelations: mock(() => []),
    }
    mockUnitsRepo = {
      getById: mock(() => ({
        id: 'unit-1',
        unitNumber: '4A',
        buildingId: 'building-1',
        aliquotPercentage: '5.50',
        isActive: true,
      })),
    }

    service = new GetUnitAccountStatementService(
      mockQuotasRepo as never,
      mockPaymentsRepo as never,
      mockApplicationsRepo as never,
      mockUnitsRepo as never
    )
  })

  // ─── Validation ──────────────────────────────────────────────────────────

  it('returns NOT_FOUND when unit does not exist', async () => {
    mockUnitsRepo.getById!.mockResolvedValue(null)

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND')
    }
  })

  // ─── Empty state ─────────────────────────────────────────────────────────

  it('returns zeroed statement when unit has no quotas or payments', async () => {
    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.previousBalance).toBe('0.00')
      expect(result.data.totalCharges).toBe('0.00')
      expect(result.data.totalPayments).toBe('0.00')
      expect(result.data.totalInterest).toBe('0.00')
      expect(result.data.currentBalance).toBe('0.00')
      expect(result.data.lineItems).toHaveLength(0)
    }
  })

  // ─── Previous balance ────────────────────────────────────────────────────

  it('calculates previous balance from quotas before the period', async () => {
    mockQuotasRepo.getByUnitId!.mockResolvedValue([
      // Before period: Jan, Feb (unpaid)
      createMockQuota({
        id: 'q-jan',
        periodMonth: 1,
        issueDate: '2026-01-01',
        dueDate: '2026-01-15',
        status: 'overdue',
        balance: '1000.00',
      }),
      createMockQuota({
        id: 'q-feb',
        periodMonth: 2,
        issueDate: '2026-02-01',
        dueDate: '2026-02-15',
        status: 'partial',
        balance: '500.00',
        paidAmount: '500.00',
      }),
      // In period: March
      createMockQuota({
        id: 'q-mar',
        periodMonth: 3,
        issueDate: '2026-03-01',
        dueDate: '2026-03-15',
        status: 'pending',
        balance: '1000.00',
      }),
    ])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      // Previous balance = sum of balances from quotas issued before period
      expect(result.data.previousBalance).toBe('1500.00')
      // Charges in period = effective amount of quotas issued in period
      expect(result.data.totalCharges).toBe('1000.00')
    }
  })

  // ─── Charges in period ───────────────────────────────────────────────────

  it('calculates charges from quotas issued within the period', async () => {
    mockQuotasRepo.getByUnitId!.mockResolvedValue([
      createMockQuota({
        id: 'q-1',
        issueDate: '2026-03-01',
        baseAmount: '1000.00',
        adjustmentsTotal: '0',
      }),
      createMockQuota({
        id: 'q-2',
        issueDate: '2026-03-01',
        baseAmount: '200.00',
        adjustmentsTotal: '-50.00',
        paymentConceptId: 'concept-2',
      }),
    ])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      // Charges = sum of effective amounts (base + adjustments)
      expect(result.data.totalCharges).toBe('1150.00')
    }
  })

  // ─── Payments in period ──────────────────────────────────────────────────

  it('calculates payments from completed payments in the period', async () => {
    mockPaymentsRepo.getByUnitId!.mockResolvedValue([
      createMockPayment({ id: 'p-1', amount: '500.00', paymentDate: '2026-03-10' }),
      createMockPayment({ id: 'p-2', amount: '300.00', paymentDate: '2026-03-20' }),
      // This one is before the period — should be excluded from totalPayments
      createMockPayment({ id: 'p-3', amount: '200.00', paymentDate: '2026-02-15' }),
      // Failed payment — should be excluded
      createMockPayment({
        id: 'p-4',
        amount: '100.00',
        paymentDate: '2026-03-25',
        status: 'failed',
      }),
    ])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      // Only completed payments within period
      expect(result.data.totalPayments).toBe('800.00')
    }
  })

  // ─── Interest ────────────────────────────────────────────────────────────

  it('calculates total interest from quotas with interest in the period', async () => {
    mockQuotasRepo.getByUnitId!.mockResolvedValue([
      createMockQuota({
        id: 'q-1',
        issueDate: '2026-03-01',
        interestAmount: '50.00',
        balance: '1050.00',
      }),
      createMockQuota({
        id: 'q-2',
        issueDate: '2026-03-01',
        interestAmount: '25.00',
        balance: '525.00',
        paymentConceptId: 'concept-2',
      }),
    ])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.totalInterest).toBe('75.00')
    }
  })

  // ─── Current balance ─────────────────────────────────────────────────────

  it('calculates current balance = previous + charges + interest - payments', async () => {
    mockQuotasRepo.getByUnitId!.mockResolvedValue([
      // Before period: overdue with balance 500
      createMockQuota({
        id: 'q-old',
        periodMonth: 2,
        issueDate: '2026-02-01',
        dueDate: '2026-02-15',
        status: 'overdue',
        balance: '500.00',
        interestAmount: '0',
      }),
      // In period: new charge 1000 with 30 interest
      createMockQuota({
        id: 'q-new',
        periodMonth: 3,
        issueDate: '2026-03-01',
        dueDate: '2026-03-15',
        status: 'pending',
        balance: '1030.00',
        interestAmount: '30.00',
      }),
    ])
    mockPaymentsRepo.getByUnitId!.mockResolvedValue([
      createMockPayment({ id: 'p-1', amount: '400.00', paymentDate: '2026-03-10' }),
    ])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      // previous=500, charges=1000, interest=30, payments=400
      // current = 500 + 1000 + 30 - 400 = 1130
      expect(result.data.currentBalance).toBe('1130.00')
    }
  })

  // ─── Line items ──────────────────────────────────────────────────────────

  it('generates chronological line items for charges and payments', async () => {
    mockQuotasRepo.getByUnitId!.mockResolvedValue([
      createMockQuota({
        id: 'q-1',
        issueDate: '2026-03-01',
        dueDate: '2026-03-15',
        baseAmount: '1000.00',
      }),
    ])
    mockPaymentsRepo.getByUnitId!.mockResolvedValue([
      createMockPayment({
        id: 'p-1',
        amount: '500.00',
        paymentDate: '2026-03-10',
        paymentMethod: 'transfer',
        receiptNumber: 'REF-001',
      }),
    ])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.lineItems.length).toBeGreaterThanOrEqual(2)

      const chargeItem = result.data.lineItems.find(li => li.type === 'charge')
      expect(chargeItem).toBeDefined()
      expect(chargeItem!.amount).toBe('1000.00')

      const paymentItem = result.data.lineItems.find(li => li.type === 'payment')
      expect(paymentItem).toBeDefined()
      expect(paymentItem!.amount).toBe('500.00')

      // Items should be sorted by date
      const dates = result.data.lineItems.map(li => li.date)
      const sorted = [...dates].sort()
      expect(dates).toEqual(sorted)
    }
  })

  // ─── Aging breakdown ─────────────────────────────────────────────────────

  it('calculates aging breakdown for unpaid quotas', async () => {
    mockQuotasRepo.getByUnitId!.mockResolvedValue([
      // Current (due within 30 days): due Mar 15 = 16 days ago
      createMockQuota({
        id: 'q-current',
        dueDate: '2026-03-15',
        status: 'overdue',
        balance: '1000.00',
      }),
      // 30 days: due Feb 20 = 39 days ago
      createMockQuota({
        id: 'q-30',
        periodMonth: 2,
        issueDate: '2026-02-01',
        dueDate: '2026-02-20',
        status: 'overdue',
        balance: '800.00',
      }),
      // 60 days: due Jan 15 = 75 days ago
      createMockQuota({
        id: 'q-60',
        periodMonth: 1,
        issueDate: '2026-01-01',
        dueDate: '2026-01-15',
        status: 'overdue',
        balance: '600.00',
      }),
      // 90+ days: due Dec 15 = 106 days ago
      createMockQuota({
        id: 'q-90',
        periodYear: 2025,
        periodMonth: 12,
        issueDate: '2025-12-01',
        dueDate: '2025-12-15',
        status: 'overdue',
        balance: '400.00',
      }),
      // Paid — should NOT appear in aging
      createMockQuota({
        id: 'q-paid',
        periodMonth: 1,
        issueDate: '2026-01-01',
        dueDate: '2026-01-15',
        status: 'paid',
        balance: '0',
      }),
    ])

    const result = await service.execute({ ...defaultInput, asOfDate: '2026-03-31' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.aging.current).toBe('1000.00')
      expect(result.data.aging.days30).toBe('800.00')
      expect(result.data.aging.days60).toBe('600.00')
      expect(result.data.aging.days90Plus).toBe('400.00')
      expect(result.data.aging.total).toBe('2800.00')
    }
  })

  // ─── Cancelled/exonerated excluded ───────────────────────────────────────

  it('excludes cancelled and exonerated quotas from balances', async () => {
    mockQuotasRepo.getByUnitId!.mockResolvedValue([
      createMockQuota({
        id: 'q-active',
        issueDate: '2026-03-01',
        balance: '1000.00',
        status: 'pending',
      }),
      createMockQuota({
        id: 'q-cancelled',
        issueDate: '2026-03-01',
        balance: '500.00',
        status: 'cancelled',
      }),
      createMockQuota({
        id: 'q-exonerated',
        issueDate: '2026-03-01',
        balance: '300.00',
        status: 'exonerated',
      }),
    ])

    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      // Only the active quota should count
      expect(result.data.totalCharges).toBe('1000.00')
      expect(result.data.currentBalance).toBe('1000.00')
    }
  })

  // ─── Unit info in output ─────────────────────────────────────────────────

  it('includes unit information in the statement', async () => {
    const result = await service.execute(defaultInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.unit.id).toBe('unit-1')
      expect(result.data.unit.unitNumber).toBe('4A')
      expect(result.data.unit.aliquotPercentage).toBe('5.50')
    }
  })
})
