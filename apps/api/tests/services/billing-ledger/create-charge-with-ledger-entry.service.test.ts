import { describe, it, expect, beforeEach } from 'bun:test'
import type { TCharge, TUnitLedgerEntry } from '@packages/domain'
import { CreateChargeWithLedgerEntryService } from '@src/services/billing-ledger/create-charge-with-ledger-entry.service'

const channelId = 'channel-001'
const unitId = 'unit-001'
const currencyId = 'currency-001'
const chargeTypeId = 'ct-001'

let createdCharge: TCharge | null
let createdEntry: TUnitLedgerEntry | null
let chargeIdCounter: number

describe('CreateChargeWithLedgerEntryService', () => {
  let service: CreateChargeWithLedgerEntryService

  beforeEach(() => {
    createdCharge = null
    createdEntry = null
    chargeIdCounter = 0

    const mockChargesRepo = {
      create: async (data: any) => {
        createdCharge = {
          id: `charge-${++chargeIdCounter}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as TCharge
        return createdCharge
      },
    }

    const mockAppendService = {
      execute: async (input: any) => {
        createdEntry = {
          id: 'entry-1',
          ...input,
          runningBalance: input.amount,
          createdAt: new Date(),
        } as TUnitLedgerEntry
        return { success: true, data: createdEntry }
      },
    }

    service = new CreateChargeWithLedgerEntryService(
      mockChargesRepo as never,
      mockAppendService as never,
    )
  })

  it('should create a debit charge and a debit ledger entry', async () => {
    const result = await service.execute({
      billingChannelId: channelId,
      chargeTypeId,
      unitId,
      periodYear: 2026,
      periodMonth: 3,
      description: 'Administración Marzo 2026',
      amount: '4189.12',
      currencyId,
      entryDate: '2026-03-05',
      createdBy: 'admin-001',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.charge.amount).toBe('4189.12')
      expect(result.data.charge.isCredit).toBe(false)
      expect(result.data.charge.status).toBe('pending')
      expect(result.data.charge.balance).toBe('4189.12')
      expect(result.data.entry.entryType).toBe('debit')
    }
  })

  it('should create a credit charge and a credit ledger entry', async () => {
    const result = await service.execute({
      billingChannelId: channelId,
      chargeTypeId,
      unitId,
      periodYear: 2026,
      periodMonth: 3,
      description: 'Nota de crédito: ajuste electricidad',
      amount: '5000.00',
      currencyId,
      isCredit: true,
      entryDate: '2026-03-10',
      createdBy: 'admin-001',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.charge.isCredit).toBe(true)
      expect(result.data.charge.status).toBe('paid') // credits are immediately applied
      expect(result.data.entry.entryType).toBe('credit')
    }
  })

  it('should reject zero amount', async () => {
    const result = await service.execute({
      billingChannelId: channelId,
      chargeTypeId,
      unitId,
      periodYear: 2026,
      periodMonth: 3,
      description: 'Zero',
      amount: '0',
      currencyId,
      entryDate: '2026-03-05',
    })

    expect(result.success).toBe(false)
  })
})
