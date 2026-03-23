import { describe, it, expect, mock } from 'bun:test'
import { GetReconciliationSummaryService } from './get-reconciliation-summary.service'

type TMockReconciliationsRepo = {
  getById: ReturnType<typeof mock>
}
type TMockEntriesRepo = {
  getByImportId: ReturnType<typeof mock>
}
type TMockMatchesRepo = {
  getByEntryIds: ReturnType<typeof mock>
}
type TMockImportsRepo = {
  getByBankAccountAndPeriod: ReturnType<typeof mock>
}

function createMockRepos() {
  return {
    reconciliationsRepo: {
      getById: mock(() =>
        Promise.resolve({
          id: 'recon-001',
          bankAccountId: 'ba-001',
          condominiumId: 'condo-001',
          periodFrom: new Date('2026-03-01'),
          periodTo: new Date('2026-03-31'),
          status: 'in_progress',
          totalMatched: 0,
          totalUnmatched: 0,
          totalIgnored: 0,
        })
      ),
    } as TMockReconciliationsRepo,
    entriesRepo: {
      getByImportId: mock(() => Promise.resolve([])),
    } as TMockEntriesRepo,
    matchesRepo: {
      getByEntryIds: mock(() => Promise.resolve([])),
    } as TMockMatchesRepo,
    importsRepo: {
      getByBankAccountAndPeriod: mock(() => Promise.resolve([{ id: 'import-001' }])),
    } as TMockImportsRepo,
  }
}

describe('GetReconciliationSummaryService', () => {
  it('returns summary with counts and entries', async () => {
    const repos = createMockRepos()
    repos.entriesRepo.getByImportId = mock(() =>
      Promise.resolve([
        { id: 'e1', status: 'matched', amount: '100.00', entryType: 'credit' },
        { id: 'e2', status: 'unmatched', amount: '200.00', entryType: 'credit' },
        { id: 'e3', status: 'ignored', amount: '5.00', entryType: 'debit' },
      ])
    )
    repos.matchesRepo.getByEntryIds = mock(() =>
      Promise.resolve([{ entryId: 'e1', paymentId: 'p1', matchType: 'auto_reference' }])
    )

    const service = new GetReconciliationSummaryService(
      repos.reconciliationsRepo as never,
      repos.entriesRepo as never,
      repos.matchesRepo as never,
      repos.importsRepo as never
    )

    const result = await service.execute({ reconciliationId: 'recon-001' })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.totalMatched).toBe(1)
    expect(result.data.totalUnmatched).toBe(1)
    expect(result.data.totalIgnored).toBe(1)
    expect(result.data.unmatchedEntries).toHaveLength(1)
  })

  it('fails if reconciliation not found', async () => {
    const repos = createMockRepos()
    repos.reconciliationsRepo.getById = mock(() => Promise.resolve(null))

    const service = new GetReconciliationSummaryService(
      repos.reconciliationsRepo as never,
      repos.entriesRepo as never,
      repos.matchesRepo as never,
      repos.importsRepo as never
    )

    const result = await service.execute({ reconciliationId: 'nonexistent' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.code).toBe('NOT_FOUND')
  })

  it('returns empty summary when no imports exist', async () => {
    const repos = createMockRepos()
    repos.importsRepo.getByBankAccountAndPeriod = mock(() => Promise.resolve([]))

    const service = new GetReconciliationSummaryService(
      repos.reconciliationsRepo as never,
      repos.entriesRepo as never,
      repos.matchesRepo as never,
      repos.importsRepo as never
    )

    const result = await service.execute({ reconciliationId: 'recon-001' })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.totalMatched).toBe(0)
    expect(result.data.totalUnmatched).toBe(0)
    expect(result.data.totalIgnored).toBe(0)
  })
})
