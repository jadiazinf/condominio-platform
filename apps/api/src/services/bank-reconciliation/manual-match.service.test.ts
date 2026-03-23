import { describe, it, expect, mock } from 'bun:test'
import { ManualMatchService } from './manual-match.service'

type TMockEntriesRepo = {
  getById: ReturnType<typeof mock>
  updateStatus: ReturnType<typeof mock>
}
type TMockMatchesRepo = {
  create: ReturnType<typeof mock>
  getByEntryId: ReturnType<typeof mock>
  getByPaymentId: ReturnType<typeof mock>
}
type TMockPaymentsRepo = {
  getById: ReturnType<typeof mock>
}

function createMockRepos() {
  return {
    entriesRepo: {
      getById: mock(() =>
        Promise.resolve({
          id: 'entry-001',
          importId: 'import-001',
          status: 'unmatched',
          entryType: 'credit',
          amount: '150.00',
        })
      ),
      updateStatus: mock(() => Promise.resolve(null)),
    } as TMockEntriesRepo,
    matchesRepo: {
      create: mock((data: Record<string, unknown>) =>
        Promise.resolve({ id: 'match-001', ...data, createdAt: new Date() })
      ),
      getByEntryId: mock(() => Promise.resolve(null)),
      getByPaymentId: mock(() => Promise.resolve([])),
    } as TMockMatchesRepo,
    paymentsRepo: {
      getById: mock(() =>
        Promise.resolve({ id: 'payment-001', amount: '150.00', status: 'completed' })
      ),
    } as TMockPaymentsRepo,
  }
}

describe('ManualMatchService', () => {
  it('creates a manual match between entry and payment', async () => {
    const repos = createMockRepos()
    const service = new ManualMatchService(
      repos.entriesRepo as never,
      repos.matchesRepo as never,
      repos.paymentsRepo as never
    )

    const result = await service.execute({
      entryId: 'entry-001',
      paymentId: 'payment-001',
      matchedBy: 'user-001',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.matchType).toBe('manual')
    expect(repos.matchesRepo.create).toHaveBeenCalled()
    expect(repos.entriesRepo.updateStatus).toHaveBeenCalled()
  })

  it('fails if entry not found', async () => {
    const repos = createMockRepos()
    repos.entriesRepo.getById = mock(() => Promise.resolve(null))
    const service = new ManualMatchService(
      repos.entriesRepo as never,
      repos.matchesRepo as never,
      repos.paymentsRepo as never
    )

    const result = await service.execute({
      entryId: 'nonexistent',
      paymentId: 'payment-001',
      matchedBy: 'user-001',
    })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.code).toBe('NOT_FOUND')
  })

  it('fails if entry is already matched', async () => {
    const repos = createMockRepos()
    repos.entriesRepo.getById = mock(() => Promise.resolve({ id: 'entry-001', status: 'matched' }))
    const service = new ManualMatchService(
      repos.entriesRepo as never,
      repos.matchesRepo as never,
      repos.paymentsRepo as never
    )

    const result = await service.execute({
      entryId: 'entry-001',
      paymentId: 'payment-001',
      matchedBy: 'user-001',
    })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.code).toBe('CONFLICT')
  })

  it('fails if payment not found', async () => {
    const repos = createMockRepos()
    repos.paymentsRepo.getById = mock(() => Promise.resolve(null))
    const service = new ManualMatchService(
      repos.entriesRepo as never,
      repos.matchesRepo as never,
      repos.paymentsRepo as never
    )

    const result = await service.execute({
      entryId: 'entry-001',
      paymentId: 'nonexistent',
      matchedBy: 'user-001',
    })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.code).toBe('NOT_FOUND')
  })

  it('fails if payment already matched to another entry', async () => {
    const repos = createMockRepos()
    repos.matchesRepo.getByPaymentId = mock(() =>
      Promise.resolve([{ id: 'match-existing', entryId: 'entry-other', paymentId: 'payment-001' }])
    )
    const service = new ManualMatchService(
      repos.entriesRepo as never,
      repos.matchesRepo as never,
      repos.paymentsRepo as never
    )

    const result = await service.execute({
      entryId: 'entry-001',
      paymentId: 'payment-001',
      matchedBy: 'user-001',
    })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.code).toBe('CONFLICT')
  })
})
