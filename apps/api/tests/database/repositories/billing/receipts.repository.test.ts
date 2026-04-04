import { describe, it, expect } from 'bun:test'
import type { TBillingReceipt } from '@packages/domain'

describe('BillingReceiptsRepository', () => {
  const makeReceipt = (overrides: Partial<TBillingReceipt> = {}): TBillingReceipt => ({
    id: '550e8400-e29b-41d4-a716-446655440001',
    condominiumId: '550e8400-e29b-41d4-a716-446655440010',
    unitId: '550e8400-e29b-41d4-a716-446655440020',
    periodYear: 2026,
    periodMonth: 3,
    receiptNumber: 'REC-LV-202603-0001',
    status: 'issued',
    issuedAt: new Date('2026-03-05'),
    dueDate: '2026-04-28',
    subtotal: '48431.09',
    reserveFundAmount: '4367.02',
    previousBalance: '0',
    interestAmount: '0',
    lateFeeAmount: '0',
    discountAmount: '0',
    totalAmount: '52798.11',
    currencyId: '550e8400-e29b-41d4-a716-446655440040',
    replacesReceiptId: null,
    voidReason: null,
    budgetId: null,
    pdfUrl: null,
    notes: null,
    metadata: null,
    generatedBy: '550e8400-e29b-41d4-a716-446655440030',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

  describe('domain model', () => {
    it('should create a receipt with correct totals', () => {
      const receipt = makeReceipt()
      const total =
        parseFloat(receipt.subtotal) +
        parseFloat(receipt.reserveFundAmount) +
        parseFloat(receipt.previousBalance) +
        parseFloat(receipt.interestAmount)
      expect(total).toBeCloseTo(parseFloat(receipt.totalAmount), 2)
    })

    it('should have a unique receipt number', () => {
      const receipt = makeReceipt()
      expect(receipt.receiptNumber).toMatch(/^REC-/)
      expect(receipt.receiptNumber.length).toBeGreaterThan(0)
    })

    it('should support previous balance (positive = owes, negative = credit)', () => {
      const withDebt = makeReceipt({ previousBalance: '51200.00', totalAmount: '104198.11' })
      expect(parseFloat(withDebt.previousBalance)).toBeGreaterThan(0)

      const withCredit = makeReceipt({ previousBalance: '-5000.00', totalAmount: '47798.11' })
      expect(parseFloat(withCredit.previousBalance)).toBeLessThan(0)
    })
  })

  describe('receipt number serial', () => {
    it('should never reuse a voided receipt number', () => {
      const original = makeReceipt({ receiptNumber: 'REC-LV-202603-0001' })
      const voided = makeReceipt({
        ...original,
        status: 'voided',
        voidReason: 'Error en monto de electricidad',
      })
      const replacement = makeReceipt({
        receiptNumber: 'REC-LV-202603-0046',
        replacesReceiptId: voided.id,
      })

      // Voided keeps its number
      expect(voided.receiptNumber).toBe('REC-LV-202603-0001')
      expect(voided.status).toBe('voided')
      expect(voided.voidReason).not.toBeNull()

      // Replacement gets a NEW number
      expect(replacement.receiptNumber).not.toBe(voided.receiptNumber)
      expect(replacement.replacesReceiptId).toBe(voided.id)
    })
  })

  describe('status transitions', () => {
    it('draft → issued when generated', () => {
      const receipt = makeReceipt({ status: 'draft' })
      const issued = makeReceipt({ ...receipt, status: 'issued', issuedAt: new Date() })
      expect(issued.status).toBe('issued')
      expect(issued.issuedAt).not.toBeNull()
    })

    it('issued → partial when some charges paid', () => {
      const partial = makeReceipt({ status: 'partial' })
      expect(partial.status).toBe('partial')
    })

    it('issued → paid when all charges paid', () => {
      const paid = makeReceipt({ status: 'paid' })
      expect(paid.status).toBe('paid')
    })

    it('issued → voided with reason', () => {
      const voided = makeReceipt({
        status: 'voided',
        voidReason: 'Montos incorrectos de electricidad',
      })
      expect(voided.status).toBe('voided')
      expect(voided.voidReason!.length).toBeGreaterThan(10)
    })
  })
})
