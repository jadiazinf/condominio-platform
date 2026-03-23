import { describe, it, expect, mock } from 'bun:test'
import { ReconcileService } from './reconcile.service'

type TMockReconciliationsRepo = {
  getById: ReturnType<typeof mock>
  update: ReturnType<typeof mock>
}
type TMockEntriesRepo = {
  getByImportId: ReturnType<typeof mock>
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
      update: mock((id: string, data: unknown) =>
        Promise.resolve({ id, ...(data as object), status: 'completed' })
      ),
    } as TMockReconciliationsRepo,
    entriesRepo: {
      getByImportId: mock(() => Promise.resolve([])),
    } as TMockEntriesRepo,
    importsRepo: {
      getByBankAccountAndPeriod: mock(() => Promise.resolve([{ id: 'import-001' }])),
    } as TMockImportsRepo,
  }
}

describe('ReconcileService', () => {
  it('completes reconciliation when all entries are resolved', async () => {
    const repos = createMockRepos()
    repos.entriesRepo.getByImportId = mock(() =>
      Promise.resolve([
        { id: 'e1', status: 'matched' },
        { id: 'e2', status: 'matched' },
        { id: 'e3', status: 'ignored' },
      ])
    )

    const service = new ReconcileService(
      repos.reconciliationsRepo as never,
      repos.entriesRepo as never,
      repos.importsRepo as never
    )

    const result = await service.execute({
      reconciliationId: 'recon-001',
      reconciledBy: 'user-001',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.totalMatched).toBe(2)
    expect(result.data.totalIgnored).toBe(1)
    expect(result.data.totalUnmatched).toBe(0)
  })

  it('fails if there are unmatched entries', async () => {
    const repos = createMockRepos()
    repos.entriesRepo.getByImportId = mock(() =>
      Promise.resolve([
        { id: 'e1', status: 'matched' },
        { id: 'e2', status: 'unmatched' },
      ])
    )

    const service = new ReconcileService(
      repos.reconciliationsRepo as never,
      repos.entriesRepo as never,
      repos.importsRepo as never
    )

    const result = await service.execute({
      reconciliationId: 'recon-001',
      reconciledBy: 'user-001',
    })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.code).toBe('BAD_REQUEST')
  })

  it('fails if reconciliation not found', async () => {
    const repos = createMockRepos()
    repos.reconciliationsRepo.getById = mock(() => Promise.resolve(null))

    const service = new ReconcileService(
      repos.reconciliationsRepo as never,
      repos.entriesRepo as never,
      repos.importsRepo as never
    )

    const result = await service.execute({
      reconciliationId: 'nonexistent',
      reconciledBy: 'user-001',
    })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.code).toBe('NOT_FOUND')
  })

  it('fails if reconciliation is already completed', async () => {
    const repos = createMockRepos()
    repos.reconciliationsRepo.getById = mock(() =>
      Promise.resolve({ id: 'recon-001', status: 'completed' })
    )

    const service = new ReconcileService(
      repos.reconciliationsRepo as never,
      repos.entriesRepo as never,
      repos.importsRepo as never
    )

    const result = await service.execute({
      reconciliationId: 'recon-001',
      reconciledBy: 'user-001',
    })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.code).toBe('CONFLICT')
  })

  it('handles reconciliation with no imports in period', async () => {
    const repos = createMockRepos()
    repos.importsRepo.getByBankAccountAndPeriod = mock(() => Promise.resolve([]))

    const service = new ReconcileService(
      repos.reconciliationsRepo as never,
      repos.entriesRepo as never,
      repos.importsRepo as never
    )

    const result = await service.execute({
      reconciliationId: 'recon-001',
      reconciledBy: 'user-001',
    })

    // With no imports, there's nothing to reconcile — should succeed with zeros
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.totalMatched).toBe(0)
  })
})
