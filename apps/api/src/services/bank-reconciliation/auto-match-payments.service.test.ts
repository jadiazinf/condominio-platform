import { describe, it, expect, mock } from 'bun:test'
import { AutoMatchPaymentsService } from './auto-match-payments.service'

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

type TMockEntriesRepo = {
  getUnmatchedByImportId: ReturnType<typeof mock>
  getCreditsByImportId: ReturnType<typeof mock>
  updateStatus: ReturnType<typeof mock>
}
type TMockMatchesRepo = {
  create: ReturnType<typeof mock>
  getByEntryId: ReturnType<typeof mock>
}
type TMockPaymentsRepo = {
  getByReceiptNumber: ReturnType<typeof mock>
  getByDateRange: ReturnType<typeof mock>
}
type TMockGatewayTransactionsRepo = {
  getByExternalReference: ReturnType<typeof mock>
}

function createMockRepos() {
  return {
    entriesRepo: {
      getUnmatchedByImportId: mock(() => Promise.resolve([])),
      getCreditsByImportId: mock(() => Promise.resolve([])),
      updateStatus: mock(() => Promise.resolve(null)),
    } as TMockEntriesRepo,
    matchesRepo: {
      create: mock((data: Record<string, unknown>) =>
        Promise.resolve({ id: 'match-001', ...data, createdAt: new Date() })
      ),
      getByEntryId: mock(() => Promise.resolve(null)),
    } as TMockMatchesRepo,
    paymentsRepo: {
      getByReceiptNumber: mock(() => Promise.resolve([])),
      getByDateRange: mock(() => Promise.resolve([])),
    } as TMockPaymentsRepo,
    gatewayTransactionsRepo: {
      getByExternalReference: mock(() => Promise.resolve(null)),
    } as TMockGatewayTransactionsRepo,
  }
}

const makeEntry = (overrides: Record<string, unknown> = {}) => ({
  id: 'entry-001',
  importId: 'import-001',
  transactionDate: new Date('2026-03-10'),
  valueDate: null,
  reference: 'REF001',
  description: 'Deposito',
  amount: '150.00',
  entryType: 'credit',
  balance: null,
  status: 'unmatched',
  matchedAt: null,
  rawData: null,
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makePayment = (overrides: Record<string, unknown> = {}) => ({
  id: 'payment-001',
  paymentNumber: 'PAY-001',
  userId: 'user-001',
  unitId: 'unit-001',
  amount: '150.00',
  currencyId: 'currency-001',
  paymentMethod: 'transfer',
  paymentDate: '2026-03-10',
  status: 'completed',
  receiptNumber: 'REF001',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('AutoMatchPaymentsService', () => {
  it('matches entry by reference to payment receiptNumber', async () => {
    const repos = createMockRepos()
    repos.entriesRepo.getUnmatchedByImportId = mock(() => Promise.resolve([makeEntry()]))
    repos.paymentsRepo.getByReceiptNumber = mock(() => Promise.resolve([makePayment()]))

    const service = new AutoMatchPaymentsService(
      repos.entriesRepo as never,
      repos.matchesRepo as never,
      repos.paymentsRepo as never,
      repos.gatewayTransactionsRepo as never
    )

    const result = await service.execute({ importId: 'import-001' })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.matched).toBe(1)
    expect(result.data.unmatched).toBe(0)
    expect(result.data.matches[0]!.matchType).toBe('auto_reference')
    expect(Number(result.data.matches[0]!.confidence)).toBeGreaterThanOrEqual(95)
  })

  it('matches entry by reference to gateway external reference', async () => {
    const repos = createMockRepos()
    repos.entriesRepo.getUnmatchedByImportId = mock(() => Promise.resolve([makeEntry()]))
    repos.gatewayTransactionsRepo.getByExternalReference = mock(() =>
      Promise.resolve({ id: 'gt-001', paymentId: 'payment-001' })
    )

    const service = new AutoMatchPaymentsService(
      repos.entriesRepo as never,
      repos.matchesRepo as never,
      repos.paymentsRepo as never,
      repos.gatewayTransactionsRepo as never
    )

    const result = await service.execute({ importId: 'import-001' })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.matched).toBe(1)
    expect(result.data.matches[0]!.matchType).toBe('auto_reference')
  })

  it('matches entry by amount + date when reference fails', async () => {
    const repos = createMockRepos()
    repos.entriesRepo.getUnmatchedByImportId = mock(() =>
      Promise.resolve([makeEntry({ reference: 'UNKNOWN-REF' })])
    )
    repos.paymentsRepo.getByDateRange = mock(() => Promise.resolve([makePayment()]))

    const service = new AutoMatchPaymentsService(
      repos.entriesRepo as never,
      repos.matchesRepo as never,
      repos.paymentsRepo as never,
      repos.gatewayTransactionsRepo as never
    )

    const result = await service.execute({ importId: 'import-001' })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.matched).toBe(1)
    expect(result.data.matches[0]!.matchType).toBe('auto_amount_date')
    expect(Number(result.data.matches[0]!.confidence)).toBeGreaterThanOrEqual(70)
  })

  it('does not match when amounts differ', async () => {
    const repos = createMockRepos()
    repos.entriesRepo.getUnmatchedByImportId = mock(() =>
      Promise.resolve([makeEntry({ reference: null })])
    )
    repos.paymentsRepo.getByDateRange = mock(() =>
      Promise.resolve([makePayment({ amount: '999.99' })])
    )

    const service = new AutoMatchPaymentsService(
      repos.entriesRepo as never,
      repos.matchesRepo as never,
      repos.paymentsRepo as never,
      repos.gatewayTransactionsRepo as never
    )

    const result = await service.execute({ importId: 'import-001' })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.matched).toBe(0)
    expect(result.data.unmatched).toBe(1)
  })

  it('returns empty result for no unmatched entries', async () => {
    const repos = createMockRepos()
    const service = new AutoMatchPaymentsService(
      repos.entriesRepo as never,
      repos.matchesRepo as never,
      repos.paymentsRepo as never,
      repos.gatewayTransactionsRepo as never
    )

    const result = await service.execute({ importId: 'import-001' })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.matched).toBe(0)
    expect(result.data.unmatched).toBe(0)
    expect(result.data.matches).toHaveLength(0)
  })

  it('handles multiple entries with mixed results', async () => {
    const repos = createMockRepos()
    repos.entriesRepo.getUnmatchedByImportId = mock(() =>
      Promise.resolve([
        makeEntry({ id: 'entry-001', reference: 'REF001' }),
        makeEntry({ id: 'entry-002', reference: null, amount: '999.99' }),
      ])
    )
    repos.paymentsRepo.getByReceiptNumber = mock((ref: string) =>
      ref === 'REF001' ? Promise.resolve([makePayment()]) : Promise.resolve([])
    )
    repos.paymentsRepo.getByDateRange = mock(() => Promise.resolve([]))

    const service = new AutoMatchPaymentsService(
      repos.entriesRepo as never,
      repos.matchesRepo as never,
      repos.paymentsRepo as never,
      repos.gatewayTransactionsRepo as never
    )

    const result = await service.execute({ importId: 'import-001' })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.matched).toBe(1)
    expect(result.data.unmatched).toBe(1)
  })

  it('skips debit entries (only matches credits)', async () => {
    const repos = createMockRepos()
    repos.entriesRepo.getUnmatchedByImportId = mock(() =>
      Promise.resolve([makeEntry({ entryType: 'debit' })])
    )

    const service = new AutoMatchPaymentsService(
      repos.entriesRepo as never,
      repos.matchesRepo as never,
      repos.paymentsRepo as never,
      repos.gatewayTransactionsRepo as never
    )

    const result = await service.execute({ importId: 'import-001' })

    expect(result.success).toBe(true)
    if (!result.success) return
    // Debit entries should be skipped in matching (they're bank charges, not payments)
    expect(result.data.matched).toBe(0)
  })

  it('does not match same payment to multiple entries', async () => {
    const repos = createMockRepos()
    const sharedPayment = makePayment()
    repos.entriesRepo.getUnmatchedByImportId = mock(() =>
      Promise.resolve([
        makeEntry({ id: 'entry-001', reference: 'REF001' }),
        makeEntry({ id: 'entry-002', reference: 'REF001' }),
      ])
    )
    repos.paymentsRepo.getByReceiptNumber = mock(() => Promise.resolve([sharedPayment]))

    const service = new AutoMatchPaymentsService(
      repos.entriesRepo as never,
      repos.matchesRepo as never,
      repos.paymentsRepo as never,
      repos.gatewayTransactionsRepo as never
    )

    const result = await service.execute({ importId: 'import-001' })

    expect(result.success).toBe(true)
    if (!result.success) return
    // First entry matches, second should be skipped (payment already matched)
    expect(result.data.matched).toBe(1)
    expect(result.data.unmatched).toBe(1)
  })
})
