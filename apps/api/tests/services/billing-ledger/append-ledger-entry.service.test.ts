import { describe, it, expect, beforeEach } from 'bun:test'
import type { TUnitLedgerEntry } from '@packages/domain'
import { AppendLedgerEntryService } from '@src/services/billing-ledger/append-ledger-entry.service'

// ─── Mock types ───

type TMockLedgerRepo = {
  getLastEntry: (unitId: string, condominiumId: string) => Promise<TUnitLedgerEntry | null>
  appendEntry: (data: Omit<TUnitLedgerEntry, 'id' | 'createdAt'>) => Promise<TUnitLedgerEntry>
}

// ─── Helpers ───

const unitId = '550e8400-e29b-41d4-a716-446655440020'
const condominiumId = '550e8400-e29b-41d4-a716-446655440010'
const currencyId = '550e8400-e29b-41d4-a716-446655440040'

let storedEntries: TUnitLedgerEntry[]
let entryIdCounter: number

function makeEntry(overrides: Partial<TUnitLedgerEntry> = {}): TUnitLedgerEntry {
  return {
    id: `entry-${++entryIdCounter}`,
    unitId,
    condominiumId: condominiumId,
    entryDate: '2026-03-05',
    entryType: 'debit',
    amount: '100.00',
    currencyId,
    runningBalance: '100.00',
    description: 'Test entry',
    referenceType: 'charge',
    referenceId: '550e8400-e29b-41d4-a716-446655440099',
    paymentAmount: null,
    paymentCurrencyId: null,
    exchangeRateId: null,
    createdBy: null,
    createdAt: new Date(),
    ...overrides,
  }
}

describe('AppendLedgerEntryService', () => {
  let service: AppendLedgerEntryService
  let mockLedgerRepo: TMockLedgerRepo

  beforeEach(() => {
    storedEntries = []
    entryIdCounter = 0

    mockLedgerRepo = {
      getLastEntry: async (uid: string, cid: string) => {
        const matching = storedEntries.filter(
          e => e.unitId === uid && e.condominiumId === cid
        )
        return matching.length > 0 ? matching[matching.length - 1]! : null
      },
      appendEntry: async (data) => {
        const entry = { ...data, id: `entry-${++entryIdCounter}`, createdAt: new Date() } as TUnitLedgerEntry
        storedEntries.push(entry)
        return entry
      },
    }

    service = new AppendLedgerEntryService(mockLedgerRepo as never)
  })

  describe('first entry (no previous balance)', () => {
    it('should set runningBalance = amount for first debit', async () => {
      const result = await service.execute({
        unitId,
        condominiumId: condominiumId,
        entryDate: '2026-03-05',
        entryType: 'debit',
        amount: '48500.00',
        currencyId,
        description: 'Recibo Marzo 2026',
        referenceType: 'charge',
        referenceId: '550e8400-e29b-41d4-a716-446655440099',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.runningBalance).toBe('48500.00')
        expect(result.data.entryType).toBe('debit')
      }
    })

    it('should set runningBalance = -amount for first credit', async () => {
      const result = await service.execute({
        unitId,
        condominiumId: condominiumId,
        entryDate: '2026-03-15',
        entryType: 'credit',
        amount: '48500.00',
        currencyId,
        description: 'Pago recibido',
        referenceType: 'payment',
        referenceId: '550e8400-e29b-41d4-a716-446655440098',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.runningBalance).toBe('-48500.00')
      }
    })
  })

  describe('subsequent entries (with previous balance)', () => {
    it('should add debit to previous balance', async () => {
      // Seed: previous balance of 48500
      storedEntries.push(makeEntry({ runningBalance: '48500.00' }))

      const result = await service.execute({
        unitId,
        condominiumId: condominiumId,
        entryDate: '2026-04-05',
        entryType: 'debit',
        amount: '51200.00',
        currencyId,
        description: 'Recibo Abril 2026',
        referenceType: 'charge',
        referenceId: '550e8400-e29b-41d4-a716-446655440097',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // 48500 + 51200 = 99700
        expect(result.data.runningBalance).toBe('99700.00')
      }
    })

    it('should subtract credit from previous balance', async () => {
      storedEntries.push(makeEntry({ runningBalance: '48500.00' }))

      const result = await service.execute({
        unitId,
        condominiumId: condominiumId,
        entryDate: '2026-03-15',
        entryType: 'credit',
        amount: '48500.00',
        currencyId,
        description: 'Pago completo',
        referenceType: 'payment',
        referenceId: '550e8400-e29b-41d4-a716-446655440096',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // 48500 - 48500 = 0
        expect(result.data.runningBalance).toBe('0.00')
      }
    })

    it('should allow negative balance (saldo a favor)', async () => {
      storedEntries.push(makeEntry({ runningBalance: '45.00' }))

      const result = await service.execute({
        unitId,
        condominiumId: condominiumId,
        entryDate: '2026-03-15',
        entryType: 'credit',
        amount: '100.00',
        currencyId,
        description: 'Pago mayor a deuda',
        referenceType: 'payment',
        referenceId: '550e8400-e29b-41d4-a716-446655440095',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // 45 - 100 = -55 (saldo a favor)
        expect(result.data.runningBalance).toBe('-55.00')
      }
    })
  })

  describe('cross-currency payment info', () => {
    it('should store payment currency details', async () => {
      const result = await service.execute({
        unitId,
        condominiumId: condominiumId,
        entryDate: '2026-03-15',
        entryType: 'credit',
        amount: '45.00', // in channel currency (USD)
        currencyId,
        description: 'Pago en Bs convertido a USD',
        referenceType: 'payment',
        referenceId: '550e8400-e29b-41d4-a716-446655440094',
        paymentAmount: '21226.50',
        paymentCurrencyId: '550e8400-e29b-41d4-a716-446655440050',
        exchangeRateId: '550e8400-e29b-41d4-a716-446655440060',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.paymentAmount).toBe('21226.50')
        expect(result.data.paymentCurrencyId).toBe('550e8400-e29b-41d4-a716-446655440050')
        expect(result.data.exchangeRateId).toBe('550e8400-e29b-41d4-a716-446655440060')
      }
    })
  })

  describe('validation', () => {
    it('should reject amount <= 0', async () => {
      const result = await service.execute({
        unitId,
        condominiumId: condominiumId,
        entryDate: '2026-03-05',
        entryType: 'debit',
        amount: '0',
        currencyId,
        description: 'Zero amount',
        referenceType: 'charge',
        referenceId: '550e8400-e29b-41d4-a716-446655440093',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should reject negative amount', async () => {
      const result = await service.execute({
        unitId,
        condominiumId: condominiumId,
        entryDate: '2026-03-05',
        entryType: 'debit',
        amount: '-100.00',
        currencyId,
        description: 'Negative amount',
        referenceType: 'charge',
        referenceId: '550e8400-e29b-41d4-a716-446655440092',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })
  })

  describe('sequential entries (full flow)', () => {
    it('should correctly track balance across charge → payment → charge → interest → payment', async () => {
      // 1. Charge: +48500
      const r1 = await service.execute({
        unitId, condominiumId: condominiumId, entryDate: '2026-01-05',
        entryType: 'debit', amount: '48500.00', currencyId,
        description: 'Recibo Ene', referenceType: 'charge', referenceId: 'c1',
      })
      expect(r1.success && r1.data.runningBalance).toBe('48500.00')

      // 2. Payment: -48500
      const r2 = await service.execute({
        unitId, condominiumId: condominiumId, entryDate: '2026-01-15',
        entryType: 'credit', amount: '48500.00', currencyId,
        description: 'Pago Ene', referenceType: 'payment', referenceId: 'p1',
      })
      expect(r2.success && r2.data.runningBalance).toBe('0.00')

      // 3. Charge: +51200
      const r3 = await service.execute({
        unitId, condominiumId: condominiumId, entryDate: '2026-02-05',
        entryType: 'debit', amount: '51200.00', currencyId,
        description: 'Recibo Feb', referenceType: 'charge', referenceId: 'c2',
      })
      expect(r3.success && r3.data.runningBalance).toBe('51200.00')

      // 4. Interest: +512
      const r4 = await service.execute({
        unitId, condominiumId: condominiumId, entryDate: '2026-02-28',
        entryType: 'debit', amount: '512.00', currencyId,
        description: 'Interés mora Feb', referenceType: 'interest', referenceId: 'i1',
      })
      expect(r4.success && r4.data.runningBalance).toBe('51712.00')

      // 5. Partial payment: -30000
      const r5 = await service.execute({
        unitId, condominiumId: condominiumId, entryDate: '2026-03-10',
        entryType: 'credit', amount: '30000.00', currencyId,
        description: 'Pago parcial', referenceType: 'payment', referenceId: 'p2',
      })
      expect(r5.success && r5.data.runningBalance).toBe('21712.00')
    })
  })
})
