import { describe, it, expect, beforeEach } from 'bun:test'
import type { TBillingReceipt } from '@packages/domain'
import { ApplyLateFeeService } from '@src/services/billing-fees/apply-late-fee.service'

const condominiumId = 'condo-1'
const unitId = 'unit-001'
const currencyId = 'currency-001'

interface ILateFeeConfig {
  latePaymentType: string
  latePaymentValue: string | null
  gracePeriodDays: number
}

function makeConfig(overrides: Partial<ILateFeeConfig> = {}): ILateFeeConfig {
  return {
    latePaymentType: 'percentage',
    latePaymentValue: '0.02', // 2%
    gracePeriodDays: 5,
    ...overrides,
  }
}

function makeReceipt(overrides: Partial<TBillingReceipt> = {}): TBillingReceipt {
  return {
    id: 'receipt-1', condominiumId, unitId,
    periodYear: 2026, periodMonth: 1,
    receiptNumber: 'REC-001', status: 'issued',
    issuedAt: new Date('2026-01-05'),
    dueDate: '2026-01-28',
    subtotal: '50000.00', reserveFundAmount: '5000.00',
    previousBalance: '0', interestAmount: '0',
    lateFeeAmount: '0', discountAmount: '0',
    totalAmount: '55000.00', currencyId,
    replacesReceiptId: null, voidReason: null,
    budgetId: null, pdfUrl: null, notes: null,
    metadata: null, generatedBy: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

let createdCharges: any[]

describe('ApplyLateFeeService', () => {
  let service: ApplyLateFeeService

  beforeEach(() => {
    createdCharges = []

    const mockChargesRepo = {
      findPendingByUnitAndCondominium: async () => [],
    }

    const mockCreateChargeService = {
      execute: async (input: any) => {
        const charge = { id: `fee-${createdCharges.length + 1}`, ...input }
        createdCharges.push(charge)
        return { success: true, data: { charge, entry: {} } }
      },
    }

    const mockChargeTypesRepo = {
      findByCategory: async () => ({
        id: 'ct-late-fee', categoryId: 'cat-late-fee',
      }),
    }

    service = new ApplyLateFeeService(
      mockChargeTypesRepo as never,
      mockCreateChargeService as never,
    )
  })

  describe('percentage late fee', () => {
    it('should apply 2% late fee when overdue beyond grace', async () => {
      const config = makeConfig()
      const receipt = makeReceipt()

      const result = await service.execute({
        condominiumId, config, receipt, unitId,
        paymentDate: '2026-02-10', // 13 days overdue, beyond 5-day grace
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // 55000 * 0.02 = 1100
        expect(parseFloat(result.data.feeAmount)).toBeCloseTo(1100, 0)
        expect(createdCharges.length).toBe(1)
      }
    })
  })

  describe('fixed late fee', () => {
    it('should apply fixed amount', async () => {
      const config = makeConfig({
        latePaymentType: 'fixed',
        latePaymentValue: '500.00',
      })
      const receipt = makeReceipt()

      const result = await service.execute({
        condominiumId, config, receipt, unitId,
        paymentDate: '2026-02-10',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.feeAmount).toBe('500.00')
      }
    })
  })

  describe('within grace period', () => {
    it('should not apply late fee within grace days', async () => {
      const config = makeConfig({ gracePeriodDays: 15 })
      const receipt = makeReceipt()

      const result = await service.execute({
        condominiumId, config, receipt, unitId,
        paymentDate: '2026-02-05', // 8 days overdue, within 15-day grace
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.feeAmount).toBe('0.00')
        expect(result.data.applied).toBe(false)
        expect(createdCharges.length).toBe(0)
      }
    })
  })

  describe('late fee type none', () => {
    it('should return 0 when late fee is disabled', async () => {
      const config = makeConfig({ latePaymentType: 'none' })
      const receipt = makeReceipt()

      const result = await service.execute({
        condominiumId, config, receipt, unitId,
        paymentDate: '2026-03-15',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.feeAmount).toBe('0.00')
        expect(result.data.applied).toBe(false)
      }
    })
  })

  describe('not overdue', () => {
    it('should not apply fee if payment before due date', async () => {
      const config = makeConfig()
      const receipt = makeReceipt()

      const result = await service.execute({
        condominiumId, config, receipt, unitId,
        paymentDate: '2026-01-25', // before due date of 2026-01-28
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.feeAmount).toBe('0.00')
        expect(result.data.applied).toBe(false)
      }
    })
  })
})
