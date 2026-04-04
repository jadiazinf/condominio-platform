import { describe, it, expect, beforeEach } from 'bun:test'
import type { TBillingReceipt } from '@packages/domain'
import { ApplyEarlyPaymentDiscountService } from '@src/services/billing-fees/apply-early-payment-discount.service'

const condominiumId = 'condo-1'
const unitId = 'unit-001'
const currencyId = 'currency-001'

interface IEarlyPaymentConfig {
  earlyPaymentType: string
  earlyPaymentValue: string | null
  earlyPaymentDaysBefore: number
}

function makeConfig(overrides: Partial<IEarlyPaymentConfig> = {}): IEarlyPaymentConfig {
  return {
    earlyPaymentType: 'percentage',
    earlyPaymentValue: '0.05', // 5% discount
    earlyPaymentDaysBefore: 10, // must pay 10 days before due
    ...overrides,
  }
}

function makeReceipt(): TBillingReceipt {
  return {
    id: 'receipt-1', condominiumId, unitId,
    periodYear: 2026, periodMonth: 3,
    receiptNumber: 'REC-001', status: 'issued',
    issuedAt: new Date('2026-03-05'),
    dueDate: '2026-03-28',
    subtotal: '50000.00', reserveFundAmount: '5000.00',
    previousBalance: '0', interestAmount: '0',
    lateFeeAmount: '0', discountAmount: '0',
    totalAmount: '55000.00', currencyId,
    replacesReceiptId: null, voidReason: null,
    budgetId: null, pdfUrl: null, notes: null,
    metadata: null, generatedBy: null,
    createdAt: new Date(), updatedAt: new Date(),
  }
}

let createdCharges: any[]

describe('ApplyEarlyPaymentDiscountService', () => {
  let service: ApplyEarlyPaymentDiscountService

  beforeEach(() => {
    createdCharges = []

    const mockCreateChargeService = {
      execute: async (input: any) => {
        const charge = { id: `discount-${createdCharges.length + 1}`, ...input }
        createdCharges.push(charge)
        return { success: true, data: { charge, entry: {} } }
      },
    }

    const mockChargeTypesRepo = {
      findByCategory: async () => ({
        id: 'ct-discount', categoryId: 'cat-discount',
      }),
    }

    service = new ApplyEarlyPaymentDiscountService(
      mockChargeTypesRepo as never,
      mockCreateChargeService as never,
    )
  })

  describe('percentage discount', () => {
    it('should apply 5% discount when paying 10+ days early', async () => {
      const config = makeConfig()
      const receipt = makeReceipt()

      const result = await service.execute({
        condominiumId, config, receipt, unitId, paymentAmount: '55000.00',
        paymentDate: '2026-03-10', // 18 days before due (28), >= 10 required
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // 55000 * 0.05 = 2750
        expect(parseFloat(result.data.discountAmount)).toBeCloseTo(2750, 0)
        expect(result.data.applied).toBe(true)
        expect(createdCharges.length).toBe(1)
      }
    })
  })

  describe('fixed discount', () => {
    it('should apply fixed discount amount', async () => {
      const config = makeConfig({
        earlyPaymentType: 'fixed',
        earlyPaymentValue: '1000.00',
      })
      const receipt = makeReceipt()

      const result = await service.execute({
        condominiumId, config, receipt, unitId, paymentAmount: '55000.00',
        paymentDate: '2026-03-10',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.discountAmount).toBe('1000.00')
      }
    })
  })

  describe('not early enough', () => {
    it('should not apply discount if paying less than required days before due', async () => {
      const config = makeConfig()
      const receipt = makeReceipt()

      const result = await service.execute({
        condominiumId, config, receipt, unitId, paymentAmount: '55000.00',
        paymentDate: '2026-03-25', // only 3 days before due, need 10
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.discountAmount).toBe('0.00')
        expect(result.data.applied).toBe(false)
        expect(createdCharges.length).toBe(0)
      }
    })
  })

  describe('discount disabled', () => {
    it('should return 0 when early payment type is none', async () => {
      const config = makeConfig({ earlyPaymentType: 'none' })
      const receipt = makeReceipt()

      const result = await service.execute({
        condominiumId, config, receipt, unitId, paymentAmount: '55000.00',
        paymentDate: '2026-03-05',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.discountAmount).toBe('0.00')
        expect(result.data.applied).toBe(false)
      }
    })
  })
})
