import { describe, it, expect, beforeEach } from 'bun:test'
import type { TBillingReceipt, TCharge, TPaymentAllocation } from '@packages/domain'
import { VoidReceiptService } from '@src/services/billing-payments/void-receipt.service'

const receiptId = 'receipt-001'
const condominiumId = 'channel-001'
const unitId = 'unit-001'

function makeReceipt(overrides: Partial<TBillingReceipt> = {}): TBillingReceipt {
  return {
    id: receiptId, condominiumId: condominiumId, unitId,
    periodYear: 2026, periodMonth: 3,
    receiptNumber: 'REC-LV-202603-0001', status: 'issued',
    issuedAt: new Date(), dueDate: '2026-03-28',
    subtotal: '50000.00', reserveFundAmount: '5000.00',
    previousBalance: '0', interestAmount: '0',
    lateFeeAmount: '0', discountAmount: '0',
    totalAmount: '55000.00', currencyId: 'cur-1',
    replacesReceiptId: null, voidReason: null,
    budgetId: null, pdfUrl: null, notes: null,
    metadata: null, generatedBy: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

let receiptState: TBillingReceipt
let chargesState: TCharge[]
let allocationsState: TPaymentAllocation[]
let ledgerEntries: any[]

describe('VoidReceiptService', () => {
  let service: VoidReceiptService

  beforeEach(() => {
    receiptState = makeReceipt()
    chargesState = [
      { id: 'c1', condominiumId: condominiumId, unitId, amount: '50000.00', isCredit: false, status: 'pending', paidAmount: '0', balance: '50000.00' } as TCharge,
      { id: 'c2', condominiumId: condominiumId, unitId, amount: '5000.00', isCredit: false, status: 'pending', paidAmount: '0', balance: '5000.00' } as TCharge,
    ]
    allocationsState = []
    ledgerEntries = []

    const mockReceiptsRepo = {
      getById: async () => receiptState,
      update: async (_id: string, data: any) => {
        receiptState = { ...receiptState, ...data }
        return receiptState
      },
    }

    const mockChargesRepo = {
      findByReceipt: async () => chargesState,
      update: async (id: string, data: any) => {
        const idx = chargesState.findIndex(c => c.id === id)
        if (idx >= 0) chargesState[idx] = { ...chargesState[idx], ...data }
        return chargesState[idx]
      },
    }

    const mockAllocationsRepo = {
      findByCharge: async () => allocationsState,
      update: async () => null,
    }

    const mockAppendLedgerService = {
      execute: async (input: any) => {
        ledgerEntries.push(input)
        return { success: true, data: { id: 'e-1', ...input } }
      },
    }

    service = new VoidReceiptService(
      mockReceiptsRepo as never,
      mockChargesRepo as never,
      mockAllocationsRepo as never,
      mockAppendLedgerService as never,
    )
  })

  it('should void the receipt and cancel all charges', async () => {
    const result = await service.execute({
      receiptId,
      voidReason: 'Error en montos de electricidad del período',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(receiptState.status).toBe('voided')
      expect(receiptState.voidReason).toContain('electricidad')
      expect(chargesState.every(c => c.status === 'cancelled')).toBe(true)
    }
  })

  it('should create reversal ledger entries for each charge', async () => {
    await service.execute({
      receiptId,
      voidReason: 'Error en montos de electricidad del período',
    })

    // 2 charges = 2 reversal entries
    expect(ledgerEntries.length).toBe(2)
    expect(ledgerEntries.every((e: any) => e.entryType === 'credit')).toBe(true) // inverse of debit
    expect(ledgerEntries.every((e: any) => e.referenceType === 'void_reversal')).toBe(true)
  })

  it('should fail if receipt already voided', async () => {
    receiptState = makeReceipt({ status: 'voided' })

    const result = await service.execute({
      receiptId, voidReason: 'Double void attempt',
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('CONFLICT')
  })

  it('should fail if receipt not found', async () => {
    const svc = new VoidReceiptService(
      { getById: async () => null } as never,
      {} as never, {} as never, {} as never,
    )

    const result = await svc.execute({ receiptId, voidReason: 'Recibo no encontrado en el sistema' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('NOT_FOUND')
  })

  it('should fail if voidReason is too short', async () => {
    const result = await service.execute({ receiptId, voidReason: 'short' })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('BAD_REQUEST')
  })

  it('should reverse payment allocations if charges had payments', async () => {
    chargesState[0]!.status = 'partial'
    chargesState[0]!.paidAmount = '20000.00'
    allocationsState = [
      { id: 'alloc-1', paymentId: 'pay-1', chargeId: 'c1', allocatedAmount: '20000.00', allocatedAt: new Date(), reversed: false, reversedAt: null, createdBy: null },
    ]

    const result = await service.execute({
      receiptId,
      voidReason: 'Error en montos, propietario ya había pagado parcial',
    })

    expect(result.success).toBe(true)
    // Allocations reversed + charges cancelled + reversal entries created
    expect(ledgerEntries.length).toBe(2)
    expect(chargesState.every(c => c.status === 'cancelled')).toBe(true)
  })
})
