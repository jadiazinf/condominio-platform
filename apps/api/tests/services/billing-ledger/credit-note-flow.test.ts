import { describe, it, expect, beforeEach } from 'bun:test'
import { CreateChargeWithLedgerEntryService } from '@services/billing-ledger/create-charge-with-ledger-entry.service'

/**
 * Tests credit note and debit note flows via CreateChargeWithLedgerEntryService.
 * This is the service used by ChargesController for /:id/credit-note and /:id/debit-note.
 */

const createMockDeps = () => {
  const createdCharges: Record<string, unknown>[] = []
  const appendedEntries: Record<string, unknown>[] = []

  return {
    chargesRepo: {
      create: async (data: Record<string, unknown>) => {
        const charge = { id: `charge-${createdCharges.length + 1}`, ...data, createdAt: new Date(), updatedAt: new Date() }
        createdCharges.push(charge)
        return charge
      },
    } as never,
    appendService: {
      execute: async (input: Record<string, unknown>) => {
        const entry = { id: `entry-${appendedEntries.length + 1}`, ...input, runningBalance: '0.00' }
        appendedEntries.push(entry)
        return { success: true, data: entry }
      },
    } as never,
    createdCharges,
    appendedEntries,
  }
}

describe('Credit Note / Debit Note Flow', () => {
  let service: CreateChargeWithLedgerEntryService
  let deps: ReturnType<typeof createMockDeps>

  beforeEach(() => {
    deps = createMockDeps()
    service = new CreateChargeWithLedgerEntryService(
      deps.chargesRepo,
      deps.appendService,
    )
  })

  it('should create a credit note with isCredit=true and status=paid', async () => {
    const result = await service.execute({
      condominiumId: 'condo-1',
      chargeTypeId: 'ct-credit',
      unitId: 'unit-1',
      periodYear: 2026,
      periodMonth: 3,
      description: 'Nota de crédito: Cobro duplicado en electricidad',
      amount: '25.00',
      currencyId: 'cur-1',
      isCredit: true,
      sourceChargeId: 'charge-original',
      entryDate: '2026-03-15',
      referenceType: 'credit_note',
      createdBy: 'admin-1',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      // Credit charges are created with status 'paid' and balance 0
      expect(deps.createdCharges[0]!.isCredit).toBe(true)
      expect(deps.createdCharges[0]!.status).toBe('paid')
      expect(deps.createdCharges[0]!.balance).toBe('0')
      expect(deps.createdCharges[0]!.sourceChargeId).toBe('charge-original')

      // Ledger entry should be credit type
      expect(deps.appendedEntries[0]!.entryType).toBe('credit')
      expect(deps.appendedEntries[0]!.referenceType).toBe('credit_note')
    }
  })

  it('should create a debit note with isCredit=false and status=pending', async () => {
    const result = await service.execute({
      condominiumId: 'condo-1',
      chargeTypeId: 'ct-debit',
      unitId: 'unit-1',
      periodYear: 2026,
      periodMonth: 3,
      description: 'Nota de débito: Ajuste por servicio adicional',
      amount: '30.00',
      currencyId: 'cur-1',
      isCredit: false,
      entryDate: '2026-03-15',
      referenceType: 'debit_note',
      createdBy: 'admin-1',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(deps.createdCharges[0]!.isCredit).toBe(false)
      expect(deps.createdCharges[0]!.status).toBe('pending')
      expect(deps.createdCharges[0]!.balance).toBe('30.00')

      expect(deps.appendedEntries[0]!.entryType).toBe('debit')
      expect(deps.appendedEntries[0]!.referenceType).toBe('debit_note')
    }
  })

  it('should create a credit entry that reduces channel balance', async () => {
    const result = await service.execute({
      condominiumId: 'condo-1',
      chargeTypeId: 'ct-discount',
      unitId: 'unit-1',
      periodYear: 2026,
      periodMonth: 3,
      description: 'Descuento por pronto pago',
      amount: '10.00',
      currencyId: 'cur-1',
      isCredit: true,
      entryDate: '2026-03-10',
      referenceType: 'discount',
      createdBy: 'system',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(deps.appendedEntries[0]!.entryType).toBe('credit')
      expect(deps.appendedEntries[0]!.amount).toBe('10.00')
    }
  })

  it('should reject zero amount', async () => {
    const result = await service.execute({
      condominiumId: 'condo-1',
      chargeTypeId: 'ct-1',
      unitId: 'unit-1',
      periodYear: 2026,
      periodMonth: 3,
      description: 'Test',
      amount: '0.00',
      currencyId: 'cur-1',
      isCredit: true,
      entryDate: '2026-03-15',
      createdBy: 'admin-1',
    })

    expect(result.success).toBe(false)
  })
})
