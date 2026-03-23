import { describe, it, expect, mock } from 'bun:test'
import { IgnoreEntryService } from './ignore-entry.service'

type TMockEntriesRepo = {
  getById: ReturnType<typeof mock>
  updateStatus: ReturnType<typeof mock>
}

describe('IgnoreEntryService', () => {
  it('marks an unmatched entry as ignored', async () => {
    const entriesRepo: TMockEntriesRepo = {
      getById: mock(() => Promise.resolve({ id: 'entry-001', status: 'unmatched' })),
      updateStatus: mock(() => Promise.resolve(null)),
    }
    const service = new IgnoreEntryService(entriesRepo as never)

    const result = await service.execute({ entryId: 'entry-001' })

    expect(result.success).toBe(true)
    expect(entriesRepo.updateStatus).toHaveBeenCalled()
  })

  it('fails if entry not found', async () => {
    const entriesRepo: TMockEntriesRepo = {
      getById: mock(() => Promise.resolve(null)),
      updateStatus: mock(() => Promise.resolve(null)),
    }
    const service = new IgnoreEntryService(entriesRepo as never)

    const result = await service.execute({ entryId: 'nonexistent' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.code).toBe('NOT_FOUND')
  })
})
