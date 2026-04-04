import { describe, it, expect, beforeEach } from 'bun:test'
import { VoidReceiptService } from '@services/billing-payments/void-receipt.service'

function mockReceipt(overrides: Record<string, unknown> = {}) {
  return {
    id: 'receipt-1',
    condominiumId: 'condo-1',
    unitId: 'unit-1',
    receiptNumber: 'REC-202604-001',
    status: 'issued',
    currencyId: 'cur-1',
    totalAmount: '165.00',
    voidReason: null,
    replacesReceiptId: null,
    ...overrides,
  }
}

function mockCharge(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    condominiumId: 'condo-1',
    unitId: 'unit-1',
    amount: '50.00',
    paidAmount: '0',
    balance: '50.00',
    status: 'pending',
    isCredit: false,
    description: `Cargo ${id}`,
    currencyId: 'cur-1',
    ...overrides,
  }
}

function mockAllocation(id: string, chargeId: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    paymentId: 'pay-1',
    chargeId,
    allocatedAmount: '50.00',
    reversed: false,
    reversedAt: null,
    ...overrides,
  }
}

function createMockDeps() {
  const voidedReceipts: string[] = []
  const cancelledCharges: string[] = []
  const reversedAllocations: string[] = []
  const ledgerEntries: any[] = []

  return {
    receiptsRepo: {
      getById: async (id: string) => id === 'receipt-1' ? mockReceipt() : id === 'receipt-voided' ? mockReceipt({ id: 'receipt-voided', status: 'voided' }) : null,
      update: async (id: string, data: any) => { voidedReceipts.push(id); return { ...mockReceipt(), ...data } },
    } as never,
    chargesRepo: {
      findByReceipt: async () => [mockCharge('charge-1'), mockCharge('charge-2')],
      update: async (id: string) => { cancelledCharges.push(id); return null },
    } as never,
    allocationsRepo: {
      findByCharge: async (chargeId: string) => chargeId === 'charge-1' ? [mockAllocation('alloc-1', 'charge-1')] : [],
      update: async (id: string) => { reversedAllocations.push(id); return null },
    } as never,
    appendLedgerService: {
      execute: async (input: any) => { ledgerEntries.push(input); return { success: true, data: { id: 'entry-1' } } },
    } as never,
    voidedReceipts,
    cancelledCharges,
    reversedAllocations,
    ledgerEntries,
  }
}

describe('VoidReceiptService — Void and Replace Chain', () => {
  let service: VoidReceiptService
  let deps: ReturnType<typeof createMockDeps>

  beforeEach(() => {
    deps = createMockDeps()
    service = new VoidReceiptService(deps.receiptsRepo, deps.chargesRepo, deps.allocationsRepo, deps.appendLedgerService)
  })

  // ─── Void flow ───

  it('voids receipt, cancels charges, and creates reversal entries', async () => {
    const result = await service.execute({
      receiptId: 'receipt-1',
      voidReason: 'Error en los montos del periodo de marzo',
      createdBy: 'admin-1',
    })

    expect(result.success).toBe(true)
    expect(deps.voidedReceipts).toContain('receipt-1')
    expect(deps.cancelledCharges).toHaveLength(2)
    expect(deps.ledgerEntries).toHaveLength(2) // one reversal per charge
  })

  it('reverses payment allocations when charges have payments applied', async () => {
    const result = await service.execute({
      receiptId: 'receipt-1',
      voidReason: 'Recibo incorrecto, debe regenerarse',
      createdBy: 'admin-1',
    })

    expect(result.success).toBe(true)
    expect(deps.reversedAllocations).toContain('alloc-1')
    expect(deps.reversedAllocations).toHaveLength(1) // only charge-1 had allocations
  })

  it('creates credit reversal entries for debit charges', async () => {
    await service.execute({
      receiptId: 'receipt-1',
      voidReason: 'Anulación por error administrativo',
    })

    // Debit charges get credit reversals
    expect(deps.ledgerEntries[0].entryType).toBe('credit')
    expect(deps.ledgerEntries[0].referenceType).toBe('void_reversal')
  })

  it('creates debit reversal entries for credit charges', async () => {
    deps.chargesRepo.findByReceipt = (async () => [
      mockCharge('credit-1', { isCredit: true, amount: '10.00' }),
    ]) as never

    await service.execute({
      receiptId: 'receipt-1',
      voidReason: 'Anulación de recibo con descuento',
    })

    expect(deps.ledgerEntries[0].entryType).toBe('debit') // credit charge → debit reversal
  })

  // ─── Validation ───

  it('fails if receipt not found', async () => {
    const result = await service.execute({
      receiptId: 'nonexistent',
      voidReason: 'No importa la razón aquí',
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('NOT_FOUND')
  })

  it('fails if receipt already voided', async () => {
    const result = await service.execute({
      receiptId: 'receipt-voided',
      voidReason: 'Intentando anular de nuevo',
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('CONFLICT')
  })

  it('fails if void reason too short', async () => {
    const result = await service.execute({
      receiptId: 'receipt-1',
      voidReason: 'short',
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('BAD_REQUEST')
  })

  // ─── Edge cases ───

  it('handles receipt with no charges', async () => {
    deps.chargesRepo.findByReceipt = (async () => []) as never

    const result = await service.execute({
      receiptId: 'receipt-1',
      voidReason: 'Recibo vacío generado por error',
    })

    expect(result.success).toBe(true)
    expect(deps.cancelledCharges).toHaveLength(0)
    expect(deps.ledgerEntries).toHaveLength(0)
  })

  it('handles charges with no allocations', async () => {
    deps.allocationsRepo.findByCharge = (async () => []) as never

    const result = await service.execute({
      receiptId: 'receipt-1',
      voidReason: 'Recibo sin pagos aplicados todavía',
    })

    expect(result.success).toBe(true)
    expect(deps.reversedAllocations).toHaveLength(0)
    expect(deps.cancelledCharges).toHaveLength(2) // charges still cancelled
  })

  it('includes receipt number in ledger entry description', async () => {
    await service.execute({
      receiptId: 'receipt-1',
      voidReason: 'Error de cálculo en los montos',
    })

    expect(deps.ledgerEntries[0].description).toContain('REC-202604-001')
  })
})
