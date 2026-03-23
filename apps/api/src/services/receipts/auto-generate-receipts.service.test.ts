import { describe, it, expect, mock } from 'bun:test'
import { autoGenerateReceipts } from './auto-generate-receipts.service'

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

function createMockRepos() {
  return {
    receiptsRepo: {
      getByUnitAndPeriod: mock(() => Promise.resolve(null as unknown)),
      getByCondominiumAndPeriod: mock(() => Promise.resolve([] as unknown)),
      create: mock(() =>
        Promise.resolve({
          id: 'receipt-001',
          status: 'generated',
          receiptNumber: 'REC-202603-0001',
        } as unknown)
      ),
    },
    quotasRepo: {
      getByUnitAndPeriod: mock(() =>
        Promise.resolve([
          {
            id: 'quota-001',
            baseAmount: '150.00',
            interestAmount: '0',
            paymentConcept: { conceptType: 'maintenance', name: 'Cuota de mantenimiento' },
          },
        ])
      ),
      getPendingByUnit: mock(() => Promise.resolve([])),
    },
    unitsRepo: {
      getById: mock(() =>
        Promise.resolve({
          id: 'unit-001',
          buildingId: 'building-001',
          aliquotPercentage: '5.00',
        })
      ),
    },
    buildingsRepo: {
      getById: mock(() => Promise.resolve({ id: 'building-001', condominiumId: 'condo-001' })),
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('autoGenerateReceipts', () => {
  it('generates receipts for maintenance concept type', async () => {
    const repos = createMockRepos()

    const result = await autoGenerateReceipts(repos as never, {
      unitIds: ['unit-001'],
      conceptType: 'maintenance',
      condominiumId: 'condo-001',
      periodYear: 2026,
      periodMonth: 3,
      currencyId: 'currency-001',
      generatedBy: 'user-001',
    })

    expect(result.receiptsGenerated).toBe(1)
    expect(result.receiptIds).toHaveLength(1)
    expect(result.unitReceiptMap.get('unit-001')).toBe('receipt-001')
    expect(result.errors).toHaveLength(0)
  })

  it('generates receipts for condominium_fee concept type', async () => {
    const repos = createMockRepos()

    const result = await autoGenerateReceipts(repos as never, {
      unitIds: ['unit-001'],
      conceptType: 'condominium_fee',
      condominiumId: 'condo-001',
      periodYear: 2026,
      periodMonth: 3,
      currencyId: 'currency-001',
      generatedBy: 'user-001',
    })

    expect(result.receiptsGenerated).toBe(1)
  })

  it('generates receipts for extraordinary concept type', async () => {
    const repos = createMockRepos()

    const result = await autoGenerateReceipts(repos as never, {
      unitIds: ['unit-001'],
      conceptType: 'extraordinary',
      condominiumId: 'condo-001',
      periodYear: 2026,
      periodMonth: 3,
      currencyId: 'currency-001',
      generatedBy: 'user-001',
    })

    expect(result.receiptsGenerated).toBe(1)
    expect(result.receiptIds).toHaveLength(1)
  })

  it('generates receipts for fine concept type', async () => {
    const repos = createMockRepos()

    const result = await autoGenerateReceipts(repos as never, {
      unitIds: ['unit-001'],
      conceptType: 'fine',
      condominiumId: 'condo-001',
      periodYear: 2026,
      periodMonth: 3,
      currencyId: 'currency-001',
      generatedBy: 'user-001',
    })

    expect(result.receiptsGenerated).toBe(1)
  })

  it('handles multiple units', async () => {
    let callCount = 0
    const repos = createMockRepos()
    repos.receiptsRepo.create = mock(() => {
      callCount++
      return Promise.resolve({
        id: `receipt-00${callCount}`,
        status: 'generated',
        receiptNumber: `REC-202603-000${callCount}`,
      })
    })

    const result = await autoGenerateReceipts(repos as never, {
      unitIds: ['unit-001', 'unit-002', 'unit-003'],
      conceptType: 'maintenance',
      condominiumId: 'condo-001',
      periodYear: 2026,
      periodMonth: 3,
      currencyId: 'currency-001',
      generatedBy: 'user-001',
    })

    expect(result.receiptsGenerated).toBe(3)
    expect(result.receiptIds).toHaveLength(3)
    expect(result.unitReceiptMap.size).toBe(3)
  })

  it('handles CONFLICT (existing receipt) gracefully without counting as error', async () => {
    const repos = createMockRepos()
    repos.receiptsRepo.getByUnitAndPeriod = mock(() =>
      Promise.resolve({ id: 'existing-receipt', status: 'generated' })
    )

    const result = await autoGenerateReceipts(repos as never, {
      unitIds: ['unit-001'],
      conceptType: 'maintenance',
      condominiumId: 'condo-001',
      periodYear: 2026,
      periodMonth: 3,
      currencyId: 'currency-001',
      generatedBy: 'user-001',
    })

    // CONFLICT is not counted as an error — receipt already exists
    expect(result.receiptsGenerated).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('returns empty result for empty unitIds', async () => {
    const repos = createMockRepos()

    const result = await autoGenerateReceipts(repos as never, {
      unitIds: [],
      conceptType: 'maintenance',
      condominiumId: 'condo-001',
      periodYear: 2026,
      periodMonth: 3,
      currencyId: 'currency-001',
      generatedBy: 'user-001',
    })

    expect(result.receiptsGenerated).toBe(0)
    expect(result.receiptIds).toHaveLength(0)
  })
})
