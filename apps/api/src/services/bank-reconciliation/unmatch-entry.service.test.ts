import { describe, it, expect, mock } from 'bun:test'
import { UnmatchEntryService } from './unmatch-entry.service'

type TMockEntriesRepo = {
  getById: ReturnType<typeof mock>
  updateStatus: ReturnType<typeof mock>
}
type TMockMatchesRepo = {
  getByEntryId: ReturnType<typeof mock>
  deleteByEntryId: ReturnType<typeof mock>
}

function createMockRepos() {
  return {
    entriesRepo: {
      getById: mock(() => Promise.resolve({ id: 'entry-001', status: 'matched' })),
      updateStatus: mock(() => Promise.resolve(null)),
    } as TMockEntriesRepo,
    matchesRepo: {
      getByEntryId: mock(() =>
        Promise.resolve({ id: 'match-001', entryId: 'entry-001', paymentId: 'payment-001' })
      ),
      deleteByEntryId: mock(() => Promise.resolve(true)),
    } as TMockMatchesRepo,
  }
}

describe('UnmatchEntryService', () => {
  it('unmatches a matched entry', async () => {
    const repos = createMockRepos()
    const service = new UnmatchEntryService(repos.entriesRepo as never, repos.matchesRepo as never)

    const result = await service.execute({ entryId: 'entry-001' })

    expect(result.success).toBe(true)
    expect(repos.matchesRepo.deleteByEntryId).toHaveBeenCalledWith('entry-001')
    expect(repos.entriesRepo.updateStatus).toHaveBeenCalled()
  })

  it('fails if entry not found', async () => {
    const repos = createMockRepos()
    repos.entriesRepo.getById = mock(() => Promise.resolve(null))
    const service = new UnmatchEntryService(repos.entriesRepo as never, repos.matchesRepo as never)

    const result = await service.execute({ entryId: 'nonexistent' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.code).toBe('NOT_FOUND')
  })

  it('fails if entry is not matched', async () => {
    const repos = createMockRepos()
    repos.entriesRepo.getById = mock(() =>
      Promise.resolve({ id: 'entry-001', status: 'unmatched' })
    )
    const service = new UnmatchEntryService(repos.entriesRepo as never, repos.matchesRepo as never)

    const result = await service.execute({ entryId: 'entry-001' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.code).toBe('BAD_REQUEST')
  })
})
