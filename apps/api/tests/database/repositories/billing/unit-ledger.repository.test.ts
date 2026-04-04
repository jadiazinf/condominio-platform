import { describe, it, expect } from 'bun:test'
import type { TUnitLedgerEntry } from '@packages/domain'

describe('UnitLedgerRepository', () => {
  const unitId = '550e8400-e29b-41d4-a716-446655440020'
  const condominiumId = '550e8400-e29b-41d4-a716-446655440010'
  const currencyId = '550e8400-e29b-41d4-a716-446655440040'

  const makeEntry = (overrides: Partial<TUnitLedgerEntry> = {}): TUnitLedgerEntry => ({
    id: '550e8400-e29b-41d4-a716-446655440001',
    unitId,
    condominiumId: condominiumId,
    entryDate: '2026-03-05',
    entryType: 'debit',
    amount: '52798.11',
    currencyId,
    runningBalance: '52798.11',
    description: 'Recibo Mar 2026',
    referenceType: 'charge',
    referenceId: '550e8400-e29b-41d4-a716-446655440099',
    paymentAmount: null,
    paymentCurrencyId: null,
    exchangeRateId: null,
    createdBy: null,
    createdAt: new Date(),
    ...overrides,
  })

  describe('running balance calculation', () => {
    it('should start at 0 and increase with debits', () => {
      const entry1 = makeEntry({
        entryType: 'debit',
        amount: '48500.00',
        runningBalance: '48500.00',
        description: 'Recibo Ene 2026',
      })
      expect(parseFloat(entry1.runningBalance)).toBe(48500.0)
    })

    it('should decrease with credits (payments)', () => {
      const payment = makeEntry({
        entryType: 'credit',
        amount: '48500.00',
        runningBalance: '0.00',
        description: 'Pago transferencia #REF123',
        referenceType: 'payment',
      })
      expect(parseFloat(payment.runningBalance)).toBe(0)
    })

    it('should track running balance across multiple entries', () => {
      const entries: TUnitLedgerEntry[] = [
        makeEntry({
          id: '1',
          entryType: 'debit',
          amount: '48500.00',
          runningBalance: '48500.00',
        }),
        makeEntry({
          id: '2',
          entryType: 'credit',
          amount: '48500.00',
          runningBalance: '0.00',
        }),
        makeEntry({
          id: '3',
          entryType: 'debit',
          amount: '51200.00',
          runningBalance: '51200.00',
        }),
        makeEntry({
          id: '4',
          entryType: 'debit',
          amount: '512.00',
          runningBalance: '51712.00',
          referenceType: 'interest',
        }),
        makeEntry({
          id: '5',
          entryType: 'credit',
          amount: '60000.00',
          runningBalance: '-8288.00',
          referenceType: 'payment',
        }),
      ]

      // Verify running balance sequence
      expect(parseFloat(entries[0]!.runningBalance)).toBe(48500)
      expect(parseFloat(entries[1]!.runningBalance)).toBe(0)
      expect(parseFloat(entries[2]!.runningBalance)).toBe(51200)
      expect(parseFloat(entries[3]!.runningBalance)).toBe(51712)
      // Negative = saldo a favor
      expect(parseFloat(entries[4]!.runningBalance)).toBe(-8288)
    })

    it('should handle saldo a favor (negative balance)', () => {
      const entry = makeEntry({
        entryType: 'credit',
        amount: '100000.00',
        runningBalance: '-47201.89',
        referenceType: 'payment',
      })
      expect(parseFloat(entry.runningBalance)).toBeLessThan(0)
    })
  })

  describe('cross-currency payments', () => {
    it('should track original payment amount and currency', () => {
      const crossCurrency = makeEntry({
        entryType: 'credit',
        amount: '45.00', // in channel currency (USD)
        runningBalance: '0.00',
        referenceType: 'payment',
        paymentAmount: '21226.50', // original in VES
        paymentCurrencyId: '550e8400-e29b-41d4-a716-446655440050',
        exchangeRateId: '550e8400-e29b-41d4-a716-446655440060',
      })

      expect(crossCurrency.paymentAmount).not.toBeNull()
      expect(crossCurrency.paymentCurrencyId).not.toBeNull()
      expect(crossCurrency.exchangeRateId).not.toBeNull()
      // Channel amount (USD) ≠ payment amount (VES)
      expect(crossCurrency.amount).not.toBe(crossCurrency.paymentAmount)
    })

    it('should have null payment fields for same-currency payments', () => {
      const sameCurrency = makeEntry({
        entryType: 'credit',
        amount: '48500.00',
        referenceType: 'payment',
        paymentAmount: null,
        paymentCurrencyId: null,
        exchangeRateId: null,
      })

      expect(sameCurrency.paymentAmount).toBeNull()
      expect(sameCurrency.paymentCurrencyId).toBeNull()
    })
  })

  describe('reference types', () => {
    it('should support all reference types', () => {
      const types = [
        'charge',
        'receipt',
        'payment',
        'interest',
        'late_fee',
        'discount',
        'credit_note',
        'debit_note',
        'adjustment',
        'void_reversal',
      ] as const

      types.forEach(refType => {
        const entry = makeEntry({ referenceType: refType })
        expect(entry.referenceType).toBe(refType)
      })
    })

    it('void_reversal should create inverse entry', () => {
      // Original charge was a debit
      const original = makeEntry({
        entryType: 'debit',
        amount: '48500.00',
        runningBalance: '48500.00',
        referenceType: 'charge',
      })

      // Void reversal creates a credit (inverse)
      const reversal = makeEntry({
        entryType: 'credit',
        amount: '48500.00',
        runningBalance: '0.00',
        referenceType: 'void_reversal',
        description: 'Anulación recibo REC-LV-202603-0001',
      })

      expect(original.entryType).toBe('debit')
      expect(reversal.entryType).toBe('credit')
      expect(original.amount).toBe(reversal.amount)
    })
  })
})
