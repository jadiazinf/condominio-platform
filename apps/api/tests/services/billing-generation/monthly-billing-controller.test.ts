import { describe, it, expect, beforeEach } from 'bun:test'
import { GenerateMonthlyBillingService } from '@services/billing-generation/generate-monthly-billing.service'
import type { IGenerateMonthlyBillingInput } from '@services/billing-generation/generate-monthly-billing.service'
import { PreviewMonthlyBillingService } from '@services/billing-generation/preview-monthly-billing.service'
import type { IPreviewMonthlyBillingInput } from '@services/billing-generation/preview-monthly-billing.service'

// ─── Constants ───

const CONDO_ID = 'condo-1'
const CURRENCY_ID = 'cur-1'

// ─── Factories ───

function makeUnit(id: string, aliquot: string) {
  return { id, unitNumber: `U-${id}`, aliquotPercentage: aliquot, buildingId: 'bld-1', isActive: true }
}

function makeChargeType(id: string, name: string, _category = 'ordinary') {
  return {
    id, condominiumId: CONDO_ID, name, categoryId: `cat-${_category}`,
    sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date(),
  }
}

function makeGenerateInput(overrides: Partial<IGenerateMonthlyBillingInput> = {}): IGenerateMonthlyBillingInput {
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

function makePreviewInput(overrides: Partial<IPreviewMonthlyBillingInput> = {}): IPreviewMonthlyBillingInput {
  return {
    condominiumId: CONDO_ID,
    distributionMethod: 'by_aliquot',
    chargeAmounts: [
      { chargeTypeId: 'ct-1', amount: '1000.00' },
    ],
    ...overrides,
  }
}

// ─── Mock repos for generate ───

function createGenerateMocks(units = [makeUnit('u1', '60.00'), makeUnit('u2', '40.00')]) {
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
    createdCharges,
    createdReceipts,
    updatedCharges,
    ledgerCalls,
  }
}

// ─── Mock repos for preview ───

function createPreviewMocks(units = [makeUnit('u1', '60.00'), makeUnit('u2', '40.00')]) {
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
  }
}

// ═══════════════════════════════════════════════════════════════════
// Tests: Monthly Billing Controller (service-level integration)
// ═══════════════════════════════════════════════════════════════════

describe('MonthlyBillingController — Preview', () => {
  let previewService: PreviewMonthlyBillingService
  let previewMocks: ReturnType<typeof createPreviewMocks>

  beforeEach(() => {
    previewMocks = createPreviewMocks()
    previewService = new PreviewMonthlyBillingService(
      previewMocks.unitsRepo as never,
      previewMocks.chargeTypesRepo as never,
    )
  })

  it('preview with by_aliquot distribution shows correct per-unit amounts', async () => {
    const result = await previewService.execute(makePreviewInput({
      distributionMethod: 'by_aliquot',
    }))

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.unitPreviews).toHaveLength(2)

    // U1 = 60% of 1000 = 600, U2 = 40% of 1000 = 400
    const u1 = result.data.unitPreviews.find(u => u.unitId === 'u1')!
    const u2 = result.data.unitPreviews.find(u => u.unitId === 'u2')!
    expect(u1.total).toBe('600.00')
    expect(u2.total).toBe('400.00')
  })

  it('preview with equal_split shows same amount for all units', async () => {
    const result = await previewService.execute(makePreviewInput({
      distributionMethod: 'equal_split',
    }))

    expect(result.success).toBe(true)
    if (!result.success) return

    const amounts = result.data.unitPreviews.map(u => u.total)
    // 1000 / 2 = 500 each
    expect(amounts[0]).toBe('500.00')
    expect(amounts[1]).toBe('500.00')
    expect(amounts[0]).toBe(amounts[1])
  })

  it('preview returns empty charges when no matching charge types', async () => {
    const result = await previewService.execute(makePreviewInput({
      chargeAmounts: [
        { chargeTypeId: 'nonexistent-id', amount: '500.00' },
      ],
    }))

    expect(result.success).toBe(true)
    if (!result.success) return

    // Units exist but no charges matched, so all totals are 0
    for (const unit of result.data.unitPreviews) {
      expect(unit.charges).toHaveLength(0)
      expect(unit.total).toBe('0.00')
    }
    expect(result.data.grandTotal).toBe('0.00')
  })
})

describe('MonthlyBillingController — Generate', () => {
  let generateService: GenerateMonthlyBillingService
  let mocks: ReturnType<typeof createGenerateMocks>

  beforeEach(() => {
    mocks = createGenerateMocks()
    generateService = new GenerateMonthlyBillingService(
      mocks.unitsRepo as never,
      mocks.chargeTypesRepo as never,
      mocks.receiptsRepo as never,
      mocks.chargesRepo as never,
      mocks.ledgerRepo as never,
      mocks.appendLedgerService as never,
      mocks.condominiumsRepo as never,
    )
  })

  it('generates receipts for all active units', async () => {
    const result = await generateService.execute(makeGenerateInput())

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.totalGenerated).toBe(2)
    expect(result.data.receipts).toHaveLength(2)
    expect(mocks.createdReceipts).toHaveLength(2)
  })

  it('fails when receipts already exist for the period (CONFLICT)', async () => {
    mocks.receiptsRepo.findActiveByCondominiumAndPeriod = async () => [
      { id: 'existing-receipt' } as any,
    ]

    const result = await generateService.execute(makeGenerateInput())

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('CONFLICT')
    }
  })

  it('fails when no active units exist (BAD_REQUEST)', async () => {
    mocks = createGenerateMocks([])
    generateService = new GenerateMonthlyBillingService(
      mocks.unitsRepo as never,
      mocks.chargeTypesRepo as never,
      mocks.receiptsRepo as never,
      mocks.chargesRepo as never,
      mocks.ledgerRepo as never,
      mocks.appendLedgerService as never,
      mocks.condominiumsRepo as never,
    )

    const result = await generateService.execute(makeGenerateInput())

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('BAD_REQUEST')
    }
  })

  it('creates ledger entries for each charge', async () => {
    await generateService.execute(makeGenerateInput())

    // 1 charge type × 2 units = 2 ledger entries
    expect(mocks.ledgerCalls).toHaveLength(2)
    for (const call of mocks.ledgerCalls) {
      expect(call.entryType).toBe('debit')
      expect(call.referenceType).toBe('charge')
      expect(call.condominiumId).toBe(CONDO_ID)
    }
  })

  it('stores distribution method on each charge', async () => {
    await generateService.execute(makeGenerateInput({ distributionMethod: 'equal_split' }))

    expect(mocks.createdCharges.length).toBeGreaterThan(0)
    for (const charge of mocks.createdCharges) {
      expect(charge.distributionMethod).toBe('equal_split')
    }
  })
})
