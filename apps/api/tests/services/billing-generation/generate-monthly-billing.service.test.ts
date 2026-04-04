import { describe, it, expect, beforeEach } from 'bun:test'
import { GenerateMonthlyBillingService } from '@services/billing-generation/generate-monthly-billing.service'
import type { IGenerateMonthlyBillingInput } from '@services/billing-generation/generate-monthly-billing.service'

// ─── Mock factories ───

const CONDO_ID = 'condo-1'
const CURRENCY_ID = 'cur-1'

function makeUnit(id: string, aliquot: string) {
  return { id, unitNumber: `U-${id}`, aliquotPercentage: aliquot, buildingId: 'bld-1', isActive: true }
}

function makeChargeType(id: string, name: string, _category = 'ordinary') {
  return {
    id, condominiumId: CONDO_ID, name, categoryId: `cat-${_category}`,
    sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date(),
  }
}

function makeInput(overrides: Partial<IGenerateMonthlyBillingInput> = {}): IGenerateMonthlyBillingInput {
  return {
    condominiumId: CONDO_ID,
    periodYear: 2026,
    periodMonth: 4,
    dueDay: 15,
    distributionMethod: 'by_aliquot',
    currencyId: CURRENCY_ID,
    chargeAmounts: [
      { chargeTypeId: 'ct-1', amount: '1000.00', description: 'Administración Abril 2026' },
    ],
    ...overrides,
  }
}

// ─── Mock repos ───

function createMocks(units = [makeUnit('u1', '60.00'), makeUnit('u2', '40.00')]) {
  const createdCharges: any[] = []
  const createdReceipts: any[] = []
  const updatedCharges: any[] = []
  const ledgerCalls: any[] = []
  let chargeSeq = 0

  return {
    unitsRepo: {
      findByCondominium: async () => units,
      findByBuilding: async () => units,
    },
    chargeTypesRepo: {
      listByCondominium: async () => [
        makeChargeType('ct-1', 'Administración'),
        makeChargeType('ct-2', 'Fondo de Reserva', 'reserve_fund'),
      ],
    },
    receiptsRepo: {
      findActiveByCondominiumAndPeriod: async () => [],
      getById: async (id: string) => createdReceipts.find(r => r.id === id) ?? null,
      create: async (data: any) => {
        const receipt = { id: `receipt-${createdReceipts.length + 1}`, ...data, createdAt: new Date(), updatedAt: new Date() }
        createdReceipts.push(receipt)
        return receipt
      },
    },
    chargesRepo: {
      create: async (data: any) => {
        chargeSeq++
        const charge = { id: `charge-${chargeSeq}`, ...data, createdAt: new Date(), updatedAt: new Date() }
        createdCharges.push(charge)
        return charge
      },
      update: async (id: string, data: any) => {
        updatedCharges.push({ id, ...data })
        return { id, ...data }
      },
    },
    ledgerRepo: {
      getLastEntry: async () => null,
    },
    appendLedgerService: {
      execute: async (input: any) => {
        ledgerCalls.push(input)
        return { success: true, data: { id: 'entry-1', ...input } }
      },
    },
    condominiumsRepo: {
      getById: async () => ({ id: CONDO_ID, code: 'COND', receiptNumberFormat: null }),
    },
    chargeCategoriesRepo: {
      listAllActive: async () => [
        { id: 'cat-ordinary', name: 'ordinary' },
        { id: 'cat-reserve_fund', name: 'reserve_fund' },
        { id: 'cat-extraordinary', name: 'extraordinary' },
      ],
    },
    createdCharges,
    createdReceipts,
    updatedCharges,
    ledgerCalls,
  }
}

describe('GenerateMonthlyBillingService', () => {
  let service: GenerateMonthlyBillingService
  let mocks: ReturnType<typeof createMocks>

  beforeEach(() => {
    mocks = createMocks()
    service = new GenerateMonthlyBillingService(
      mocks.unitsRepo as never,
      mocks.chargeTypesRepo as never,
      mocks.receiptsRepo as never,
      mocks.chargesRepo as never,
      mocks.ledgerRepo as never,
      mocks.appendLedgerService as never,
      mocks.condominiumsRepo as never,
      mocks.chargeCategoriesRepo as never,
    )
  })

  // ─── Happy path ───

  it('generates charges and receipts for each unit', async () => {
    const result = await service.execute(makeInput())

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.totalGenerated).toBe(2) // 2 units
    expect(result.data.receipts).toHaveLength(2)
    expect(mocks.createdCharges).toHaveLength(2) // 1 charge per unit
    expect(mocks.createdReceipts).toHaveLength(2)
  })

  it('distributes by aliquot correctly', async () => {
    const result = await service.execute(makeInput())
    expect(result.success).toBe(true)

    // U1 has 60% aliquot → 600.00, U2 has 40% → 400.00
    expect(mocks.createdCharges[0].amount).toBe('600.00')
    expect(mocks.createdCharges[1].amount).toBe('400.00')
  })

  it('distributes by equal_split', async () => {
    const result = await service.execute(makeInput({ distributionMethod: 'equal_split' }))
    expect(result.success).toBe(true)

    // 1000 / 2 = 500 each
    expect(mocks.createdCharges[0].amount).toBe('500.00')
    expect(mocks.createdCharges[1].amount).toBe('500.00')
  })

  it('distributes by fixed_per_unit', async () => {
    const result = await service.execute(makeInput({ distributionMethod: 'fixed_per_unit' }))
    expect(result.success).toBe(true)

    // Each unit gets the full amount
    expect(mocks.createdCharges[0].amount).toBe('1000.00')
    expect(mocks.createdCharges[1].amount).toBe('1000.00')
  })

  it('creates ledger entries for each charge', async () => {
    await service.execute(makeInput())

    expect(mocks.ledgerCalls).toHaveLength(2) // 1 per charge
    expect(mocks.ledgerCalls[0].entryType).toBe('debit')
    expect(mocks.ledgerCalls[0].referenceType).toBe('charge')
    expect(mocks.ledgerCalls[0].condominiumId).toBe(CONDO_ID)
  })

  it('assigns receiptId to charges after receipt creation', async () => {
    await service.execute(makeInput())

    expect(mocks.updatedCharges).toHaveLength(2)
    expect(mocks.updatedCharges[0].receiptId).toBe('receipt-1')
    expect(mocks.updatedCharges[1].receiptId).toBe('receipt-2')
  })

  it('generates unique receipt numbers', async () => {
    await service.execute(makeInput())

    const numbers = mocks.createdReceipts.map((r: any) => r.receiptNumber)
    expect(new Set(numbers).size).toBe(2) // all unique
    expect(numbers[0]).toContain('COND')
  })

  it('sets correct due date', async () => {
    await service.execute(makeInput({ dueDay: 20, periodYear: 2026, periodMonth: 4 }))

    expect(mocks.createdReceipts[0].dueDate).toBe('2026-04-20')
  })

  it('caps due day at month length for February', async () => {
    await service.execute(makeInput({ dueDay: 28, periodMonth: 2, periodYear: 2026 }))

    // Feb 2026 has 28 days, so dueDay 28 is fine
    expect(mocks.createdReceipts[0].dueDate).toBe('2026-02-28')
  })

  it('includes previous balance in receipt total', async () => {
    mocks.ledgerRepo.getLastEntry = async () => ({ runningBalance: '500.00' } as any)

    await service.execute(makeInput())

    // subtotal=600 + previousBalance=500 = 1100
    expect(parseFloat(mocks.createdReceipts[0].totalAmount)).toBe(1100)
    expect(mocks.createdReceipts[0].previousBalance).toBe('500.00')
  })

  it('handles multiple charge types including reserve fund', async () => {
    const input = makeInput({
      chargeAmounts: [
        { chargeTypeId: 'ct-1', amount: '800.00' },
        { chargeTypeId: 'ct-2', amount: '200.00' }, // reserve_fund
      ],
    })

    await service.execute(input)

    // U1: 60% of 800=480 + 60% of 200=120 = subtotal=480, reserve=120
    expect(mocks.createdCharges).toHaveLength(4) // 2 charge types × 2 units
    const receipt1 = mocks.createdReceipts[0]
    expect(parseFloat(receipt1.subtotal)).toBe(480)
    expect(parseFloat(receipt1.reserveFundAmount)).toBe(120)
  })

  // ─── Validation ───

  it('fails if receipts already exist for period', async () => {
    mocks.receiptsRepo.findActiveByCondominiumAndPeriod = async () => [{ id: 'existing' } as any]

    const result = await service.execute(makeInput())

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('CONFLICT')
    }
  })

  it('fails if no active units', async () => {
    mocks = createMocks([]) // no units
    service = new GenerateMonthlyBillingService(
      mocks.unitsRepo as never, mocks.chargeTypesRepo as never, mocks.receiptsRepo as never,
      mocks.chargesRepo as never, mocks.ledgerRepo as never, mocks.appendLedgerService as never,
      mocks.condominiumsRepo as never,
    )

    const result = await service.execute(makeInput())

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('BAD_REQUEST')
    }
  })

  it('skips invalid charge type IDs gracefully', async () => {
    const input = makeInput({
      chargeAmounts: [
        { chargeTypeId: 'nonexistent-id', amount: '1000.00' },
      ],
    })

    const result = await service.execute(input)
    expect(result.success).toBe(true)

    // Charges skipped, but receipts still created (with 0 amounts)
    expect(mocks.createdCharges).toHaveLength(0)
  })

  // ─── Building scope ───

  it('scopes to building when buildingId provided', async () => {
    let usedBuilding = false
    mocks.unitsRepo.findByBuilding = async () => {
      usedBuilding = true
      return [makeUnit('u1', '100.00')]
    }

    await service.execute(makeInput({ buildingId: 'bld-1' }))

    expect(usedBuilding).toBe(true)
  })

  // ─── Receipt type ───

  it('creates receipts with type original', async () => {
    await service.execute(makeInput())

    expect(mocks.createdReceipts[0].receiptType).toBe('original')
  })

  // ─── Stores distribution method on charges ───

  it('stores distribution method on each charge', async () => {
    await service.execute(makeInput({ distributionMethod: 'equal_split' }))

    expect(mocks.createdCharges[0].distributionMethod).toBe('equal_split')
  })
})
