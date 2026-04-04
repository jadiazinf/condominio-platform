import { describe, it, expect } from 'bun:test'
import { GenerateMonthlyBillingService } from '@services/billing-generation/generate-monthly-billing.service'
import type { IGenerateMonthlyBillingInput } from '@services/billing-generation/generate-monthly-billing.service'
import { AllocatePaymentFIFOService } from '@services/billing-ledger/allocate-payment-fifo.service'
import { AppendLedgerEntryService } from '@services/billing-ledger/append-ledger-entry.service'
import { VoidReceiptService } from '@services/billing-payments/void-receipt.service'
import { CalculateChannelInterestService } from '@services/billing-fees/calculate-channel-interest.service'
import { CreateChargeWithLedgerEntryService } from '@services/billing-ledger/create-charge-with-ledger-entry.service'
import { parseAmount, toDecimal } from '@packages/utils/money'

// ─── Constants ───

const CONDO_ID = 'condo-1'
const UNIT_ID = 'unit-1'
const CURRENCY_ID = 'cur-1'

// ─── Helpers ───

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
    distributionMethod: 'fixed_per_unit',
    currencyId: CURRENCY_ID,
    chargeAmounts: [
      { chargeTypeId: 'ct-1', amount: '500.00', description: 'Administración Abril 2026' },
    ],
    ...overrides,
  }
}

// ─── In-memory state tracker ───

function createInMemoryState() {
  const charges: any[] = []
  const receipts: any[] = []
  const ledgerEntries: any[] = []
  const allocations: any[] = []
  let chargeSeq = 0
  let receiptSeq = 0
  let entrySeq = 0
  let allocSeq = 0

  return {
    charges,
    receipts,
    ledgerEntries,
    allocations,

    chargesRepo: {
      create: async (data: any) => {
        chargeSeq++
        const charge = { id: `charge-${chargeSeq}`, ...data, createdAt: new Date('2026-04-01'), updatedAt: new Date() }
        charges.push(charge)
        return charge
      },
      update: async (id: string, data: any) => {
        const idx = charges.findIndex((c: any) => c.id === id)
        if (idx >= 0) {
          charges[idx] = { ...charges[idx], ...data }
          return charges[idx]
        }
        return { id, ...data }
      },
      findByReceipt: async (receiptId: string) => {
        return charges.filter((c: any) => c.receiptId === receiptId)
      },
      findPendingByUnitAndCondominium: async (unitId: string, condoId: string, _orderAsc?: boolean) => {
        return charges.filter(
          (c: any) => c.unitId === unitId && c.condominiumId === condoId &&
            (c.status === 'pending' || c.status === 'partial') && parseAmount(c.balance) > 0
        )
      },
    },

    receiptsRepo: {
      findActiveByCondominiumAndPeriod: async (condoId: string, year: number, month: number) => {
        return receipts.filter(
          (r: any) => r.condominiumId === condoId && r.periodYear === year &&
            r.periodMonth === month && r.status !== 'voided'
        )
      },
      create: async (data: any) => {
        receiptSeq++
        const receipt = { id: `receipt-${receiptSeq}`, ...data, createdAt: new Date(), updatedAt: new Date() }
        receipts.push(receipt)
        return receipt
      },
      getById: async (id: string) => receipts.find((r: any) => r.id === id) ?? null,
      update: async (id: string, data: any) => {
        const idx = receipts.findIndex((r: any) => r.id === id)
        if (idx >= 0) {
          receipts[idx] = { ...receipts[idx], ...data }
          return receipts[idx]
        }
        return null
      },
    },

    ledgerRepo: {
      getLastEntry: async (unitId: string, condoId: string) => {
        const unitEntries = ledgerEntries.filter(
          (e: any) => e.unitId === unitId && e.condominiumId === condoId
        )
        return unitEntries.length > 0 ? unitEntries[unitEntries.length - 1] : null
      },
      appendEntry: async (data: any) => {
        entrySeq++
        const entry = { id: `entry-${entrySeq}`, ...data, createdAt: new Date() }
        ledgerEntries.push(entry)
        return entry
      },
    },

    allocationsRepo: {
      create: async (data: any) => {
        allocSeq++
        const alloc = { id: `alloc-${allocSeq}`, ...data, allocatedAt: new Date() }
        allocations.push(alloc)
        return alloc
      },
      findByCharge: async (chargeId: string) => {
        return allocations.filter((a: any) => a.chargeId === chargeId)
      },
      update: async (id: string, data: any) => {
        const idx = allocations.findIndex((a: any) => a.id === id)
        if (idx >= 0) {
          allocations[idx] = { ...allocations[idx], ...data }
          return allocations[idx]
        }
        return null
      },
    },

    unitsRepo: {
      findByCondominium: async () => [makeUnit(UNIT_ID, '100.00')],
      findByBuilding: async () => [makeUnit(UNIT_ID, '100.00')],
    },

    chargeTypesRepo: {
      listByCondominium: async () => [
        makeChargeType('ct-1', 'Administración'),
      ],
      findByCategory: async (_condoId: string, category: string) => {
        if (category === 'interest') return makeChargeType('ct-interest', 'Interés Moratorio', 'interest')
        return null
      },
    },

    condominiumsRepo: {
      getById: async () => ({ id: CONDO_ID, code: 'COND', receiptNumberFormat: null }),
    },
  }
}

// ═══════════════════════════════════════════════════════════════════
// E2E Billing Flow Tests (mocked)
// ═══════════════════════════════════════════════════════════════════

describe('Billing E2E Flow', () => {

  it('full billing cycle: generate → pay → verify balances', async () => {
    const state = createInMemoryState()

    // Build services
    const appendLedgerService = new AppendLedgerEntryService(state.ledgerRepo as never)
    const generateService = new GenerateMonthlyBillingService(
      state.unitsRepo as never, state.chargeTypesRepo as never,
      state.receiptsRepo as never, state.chargesRepo as never,
      state.ledgerRepo as never, appendLedgerService as never,
      state.condominiumsRepo as never,
    )
    const allocateService = new AllocatePaymentFIFOService(
      state.chargesRepo as never, state.allocationsRepo as never,
      state.receiptsRepo as never,
    )

    // 1. Generate monthly billing
    const genResult = await generateService.execute(makeGenerateInput())
    expect(genResult.success).toBe(true)
    if (!genResult.success) return

    expect(genResult.data.totalGenerated).toBe(1)
    expect(state.charges).toHaveLength(1)
    expect(state.charges[0].amount).toBe('500.00')
    expect(state.charges[0].status).toBe('pending')

    // Verify ledger: debit entry created
    const debitEntries = state.ledgerEntries.filter((e: any) => e.entryType === 'debit')
    expect(debitEntries).toHaveLength(1)
    expect(debitEntries[0].amount).toBe('500.00')

    // 2. Apply full payment via FIFO
    const payResult = await allocateService.execute({
      paymentId: 'pay-1',
      unitId: UNIT_ID,
      condominiumId: CONDO_ID,
      amount: '500.00',
      strategy: 'fifo',
    })
    expect(payResult.success).toBe(true)
    if (!payResult.success) return

    expect(payResult.data.allocations).toHaveLength(1)
    expect(payResult.data.remaining).toBe('0.00')

    // 3. Verify charge is fully paid
    expect(state.charges[0].status).toBe('paid')
    expect(state.charges[0].paidAmount).toBe('500.00')
    expect(state.charges[0].balance).toBe('0.00')
  })

  it('partial payment: pay less than total, verify partial status', async () => {
    const state = createInMemoryState()

    const appendLedgerService = new AppendLedgerEntryService(state.ledgerRepo as never)
    const generateService = new GenerateMonthlyBillingService(
      state.unitsRepo as never, state.chargeTypesRepo as never,
      state.receiptsRepo as never, state.chargesRepo as never,
      state.ledgerRepo as never, appendLedgerService as never,
      state.condominiumsRepo as never,
    )
    const allocateService = new AllocatePaymentFIFOService(
      state.chargesRepo as never, state.allocationsRepo as never,
      state.receiptsRepo as never,
    )

    // Generate
    await generateService.execute(makeGenerateInput())
    expect(state.charges[0].amount).toBe('500.00')

    // Pay only 200
    const payResult = await allocateService.execute({
      paymentId: 'pay-1',
      unitId: UNIT_ID,
      condominiumId: CONDO_ID,
      amount: '200.00',
      strategy: 'fifo',
    })
    expect(payResult.success).toBe(true)
    if (!payResult.success) return

    expect(payResult.data.remaining).toBe('0.00') // all money allocated
    expect(state.charges[0].status).toBe('partial')
    expect(state.charges[0].paidAmount).toBe('200.00')
    expect(state.charges[0].balance).toBe('300.00')
  })

  it('void and re-generate: void receipt, generate new one', async () => {
    const state = createInMemoryState()

    const appendLedgerService = new AppendLedgerEntryService(state.ledgerRepo as never)
    const generateService = new GenerateMonthlyBillingService(
      state.unitsRepo as never, state.chargeTypesRepo as never,
      state.receiptsRepo as never, state.chargesRepo as never,
      state.ledgerRepo as never, appendLedgerService as never,
      state.condominiumsRepo as never,
    )
    const voidService = new VoidReceiptService(
      state.receiptsRepo as never,
      state.chargesRepo as never,
      state.allocationsRepo as never,
      appendLedgerService as never,
    )

    // 1. Generate
    const genResult = await generateService.execute(makeGenerateInput())
    expect(genResult.success).toBe(true)
    expect(state.receipts).toHaveLength(1)
    expect(state.receipts[0].status).toBe('issued')

    // 2. Void receipt
    const voidResult = await voidService.execute({
      receiptId: state.receipts[0].id,
      voidReason: 'Error en el monto de administración, se corrige',
    })
    expect(voidResult.success).toBe(true)

    // Receipt is voided, charges cancelled
    expect(state.receipts[0].status).toBe('voided')
    expect(state.charges[0].status).toBe('cancelled')

    // Reversal ledger entry (credit) was created
    const creditEntries = state.ledgerEntries.filter((e: any) => e.entryType === 'credit')
    expect(creditEntries.length).toBeGreaterThanOrEqual(1)
    expect(creditEntries[0].referenceType).toBe('void_reversal')

    // 3. Re-generate for same period (voided receipts don't block)
    const regenResult = await generateService.execute(makeGenerateInput({
      chargeAmounts: [
        { chargeTypeId: 'ct-1', amount: '550.00', description: 'Administración Abril 2026 (corregido)' },
      ],
    }))
    expect(regenResult.success).toBe(true)
    if (!regenResult.success) return

    expect(regenResult.data.totalGenerated).toBe(1)
    // New receipt created
    const activeReceipts = state.receipts.filter((r: any) => r.status !== 'voided')
    expect(activeReceipts).toHaveLength(1)
    expect(activeReceipts[0].totalAmount).toBe('550.00')
  })

  it('credit note: issue credit, verify ledger balance decreases', async () => {
    const state = createInMemoryState()

    const appendLedgerService = new AppendLedgerEntryService(state.ledgerRepo as never)
    const generateService = new GenerateMonthlyBillingService(
      state.unitsRepo as never, state.chargeTypesRepo as never,
      state.receiptsRepo as never, state.chargesRepo as never,
      state.ledgerRepo as never, appendLedgerService as never,
      state.condominiumsRepo as never,
    )
    const createChargeService = new CreateChargeWithLedgerEntryService(
      state.chargesRepo as never,
      appendLedgerService as never,
    )

    // 1. Generate billing — creates debit
    await generateService.execute(makeGenerateInput())

    // After generation: ledger balance = 500 (debit)
    const lastEntry = await state.ledgerRepo.getLastEntry(UNIT_ID, CONDO_ID)
    expect(parseAmount(lastEntry!.runningBalance)).toBe(500)

    // 2. Issue credit note (e.g., for overpayment adjustment)
    const creditResult = await createChargeService.execute({
      condominiumId: CONDO_ID,
      chargeTypeId: 'ct-1',
      unitId: UNIT_ID,
      periodYear: 2026,
      periodMonth: 4,
      description: 'Nota de crédito — ajuste sobrepago',
      amount: '100.00',
      currencyId: CURRENCY_ID,
      isCredit: true,
      entryDate: '2026-04-15',
      referenceType: 'credit_note',
    })
    expect(creditResult.success).toBe(true)

    // 3. Verify ledger: 500 (debit) - 100 (credit) = 400
    const finalEntry = await state.ledgerRepo.getLastEntry(UNIT_ID, CONDO_ID)
    expect(parseAmount(finalEntry!.runningBalance)).toBe(400)

    // Credit charge has correct properties
    const creditCharge = state.charges.find((c: any) => c.isCredit === true)
    expect(creditCharge).toBeDefined()
    expect(creditCharge.status).toBe('paid') // credits are born "paid"
    expect(creditCharge.balance).toBe('0')
  })

  it('multiple periods: generate April then May, verify running balance', async () => {
    const state = createInMemoryState()

    const appendLedgerService = new AppendLedgerEntryService(state.ledgerRepo as never)
    const generateService = new GenerateMonthlyBillingService(
      state.unitsRepo as never, state.chargeTypesRepo as never,
      state.receiptsRepo as never, state.chargesRepo as never,
      state.ledgerRepo as never, appendLedgerService as never,
      state.condominiumsRepo as never,
    )

    // 1. Generate April
    const aprilResult = await generateService.execute(makeGenerateInput({
      periodMonth: 4,
      chargeAmounts: [{ chargeTypeId: 'ct-1', amount: '500.00' }],
    }))
    expect(aprilResult.success).toBe(true)

    // After April: balance = 500
    let lastEntry = await state.ledgerRepo.getLastEntry(UNIT_ID, CONDO_ID)
    expect(parseAmount(lastEntry!.runningBalance)).toBe(500)

    // 2. Generate May (previous balance of 500 is carried into receipt)
    const mayResult = await generateService.execute(makeGenerateInput({
      periodMonth: 5,
      dueDay: 15,
      chargeAmounts: [{ chargeTypeId: 'ct-1', amount: '500.00' }],
    }))
    expect(mayResult.success).toBe(true)
    if (!mayResult.success) return

    // After May: balance = 500 + 500 = 1000
    lastEntry = await state.ledgerRepo.getLastEntry(UNIT_ID, CONDO_ID)
    expect(parseAmount(lastEntry!.runningBalance)).toBe(1000)

    // May receipt includes previous balance
    const mayReceipt = state.receipts.find((r: any) => r.periodMonth === 5)
    expect(mayReceipt).toBeDefined()
    expect(mayReceipt.previousBalance).toBe('500.00')
    expect(parseFloat(mayReceipt.totalAmount)).toBe(1000) // 500 (current) + 500 (previous)

    // Total charges: 2 (1 per period)
    expect(state.charges).toHaveLength(2)
  })

  it('interest calculation: overdue charges trigger interest charge', async () => {
    const state = createInMemoryState()

    const appendLedgerService = new AppendLedgerEntryService(state.ledgerRepo as never)
    const createChargeService = new CreateChargeWithLedgerEntryService(
      state.chargesRepo as never,
      appendLedgerService as never,
    )
    const interestService = new CalculateChannelInterestService(
      state.chargesRepo as never,
      state.chargeTypesRepo as never,
      createChargeService as never,
    )

    // Setup: create an overdue charge manually (simulating prior billing)
    await state.chargesRepo.create({
      condominiumId: CONDO_ID,
      chargeTypeId: 'ct-1',
      unitId: UNIT_ID,
      receiptId: null,
      periodYear: 2026,
      periodMonth: 3,
      description: 'Administración Marzo 2026',
      amount: '1000.00',
      isCredit: false,
      currencyId: CURRENCY_ID,
      status: 'pending',
      paidAmount: '0',
      balance: '1000.00',
      distributionMethod: 'fixed_per_unit',
      isAutoGenerated: false,
      sourceExpenseId: null,
      sourceChargeId: null,
      sourceReceiptId: null,
      metadata: null,
      createdBy: null,
    })

    // The charge was created on April 1. Calculate interest 40 days later.
    const result = await interestService.execute({
      condominiumId: CONDO_ID,
      unitId: UNIT_ID,
      calculationDate: '2026-05-11', // 40 days after charge creation (April 1)
      config: {
        interestType: 'simple',
        interestRate: '0.05', // 5% per period
        interestGracePeriodDays: 15,
        currencyId: CURRENCY_ID,
      },
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    // Interest = 1000 * 0.05 = 50
    expect(result.data.interestAmount).toBe('50.00')
    expect(result.data.overdueBalance).toBe('1000.00')

    // Interest charge was auto-generated
    const interestCharges = state.charges.filter((c: any) => c.isAutoGenerated === true)
    expect(interestCharges).toHaveLength(1)
    expect(interestCharges[0].amount).toBe('50.00')
    expect(interestCharges[0].description).toContain('Interés moratorio')

    // Ledger entry for interest debit
    const interestLedgerEntries = state.ledgerEntries.filter(
      (e: any) => e.referenceType === 'interest'
    )
    expect(interestLedgerEntries).toHaveLength(1)
    expect(interestLedgerEntries[0].entryType).toBe('debit')
    expect(interestLedgerEntries[0].amount).toBe('50.00')
  })
})
