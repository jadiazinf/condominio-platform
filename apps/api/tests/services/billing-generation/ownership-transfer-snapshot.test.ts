import { describe, it, expect, beforeEach } from 'bun:test'
import { GenerateOwnershipTransferSnapshotService } from '@services/billing-generation/generate-ownership-transfer-snapshot.service'

const mockUnit = {
  id: 'unit-1',
  condominiumId: 'condo-1',
  buildingId: 'bld-1',
}

const createMockDeps = (balance: string | null = '250.00') => {
  const createdSnapshots: Record<string, unknown>[] = []

  return {
    snapshotsRepo: {
      create: async (data: Record<string, unknown>) => {
        const snap = { id: 'snap-1', ...data, createdAt: new Date() }
        createdSnapshots.push(snap)
        return snap
      },
    } as never,
    unitsRepo: {
      getById: async (id: string) => id === 'unit-1' ? mockUnit : null,
    } as never,
    ledgerRepo: {
      getLastEntry: async (_unitId: string, _condominiumId: string) => {
        return balance ? { runningBalance: balance } : null
      },
    } as never,
    createdSnapshots,
  }
}

describe('GenerateOwnershipTransferSnapshotService', () => {
  let service: GenerateOwnershipTransferSnapshotService
  let deps: ReturnType<typeof createMockDeps>

  beforeEach(() => {
    deps = createMockDeps('250.00')
    service = new GenerateOwnershipTransferSnapshotService(
      deps.snapshotsRepo,
      deps.ledgerRepo,
      deps.unitsRepo,
    )
  })

  it('should create snapshot with debt', async () => {
    const result = await service.execute({
      unitId: 'unit-1',
      previousOwnerId: 'owner-old',
      newOwnerId: 'owner-new',
      transferDate: '2026-04-01',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.hasDebt).toBe(true)
      expect(result.data.totalDebt).toBe('250.00')
    }
  })

  it('should create snapshot without debt', async () => {
    deps = createMockDeps('0.00')
    service = new GenerateOwnershipTransferSnapshotService(
      deps.snapshotsRepo,
      deps.ledgerRepo,
      deps.unitsRepo,
    )

    const result = await service.execute({
      unitId: 'unit-1',
      previousOwnerId: 'owner-old',
      newOwnerId: 'owner-new',
      transferDate: '2026-04-01',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.hasDebt).toBe(false)
    }
  })

  it('should handle credit balance (saldo a favor)', async () => {
    deps = createMockDeps('-100.00')
    service = new GenerateOwnershipTransferSnapshotService(
      deps.snapshotsRepo,
      deps.ledgerRepo,
      deps.unitsRepo,
    )

    const result = await service.execute({
      unitId: 'unit-1',
      previousOwnerId: 'owner-old',
      newOwnerId: 'owner-new',
      transferDate: '2026-04-01',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.hasDebt).toBe(false)
    }
  })

  it('should persist snapshot to repository', async () => {
    await service.execute({
      unitId: 'unit-1',
      previousOwnerId: 'owner-old',
      newOwnerId: 'owner-new',
      transferDate: '2026-04-01',
    })

    expect(deps.createdSnapshots).toHaveLength(1)
    expect(deps.createdSnapshots[0]!.unitId).toBe('unit-1')
    expect(deps.createdSnapshots[0]!.previousOwnerId).toBe('owner-old')
    expect(deps.createdSnapshots[0]!.newOwnerId).toBe('owner-new')
  })
})
