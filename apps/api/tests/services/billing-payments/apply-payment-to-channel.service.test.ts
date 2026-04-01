import { describe, it, expect, beforeEach } from 'bun:test'
import type { TBillingChannel } from '@packages/domain'
import { ApplyPaymentToChannelService } from '@src/services/billing-payments/apply-payment-to-channel.service'

const channelId = 'channel-001'
const unitId = 'unit-001'
const currencyId = 'currency-001'
const paymentId = 'payment-001'

function makeChannel(overrides: Partial<TBillingChannel> = {}): TBillingChannel {
  return {
    id: channelId, condominiumId: 'condo-1', buildingId: null,
    name: 'Recibo', channelType: 'receipt', currencyId,
    managedBy: null, distributionMethod: 'by_aliquot',
    frequency: 'monthly', generationStrategy: 'manual',
    generationDay: 5, dueDay: 28,
    latePaymentType: 'none', latePaymentValue: null, gracePeriodDays: 0,
    earlyPaymentType: 'none', earlyPaymentValue: null, earlyPaymentDaysBefore: 0,
    interestType: 'none', interestRate: null,
    interestCalculationPeriod: null, interestGracePeriodDays: 0,
    maxInterestCapType: 'none', maxInterestCapValue: null,
    allocationStrategy: 'fifo', assemblyReference: null,
    isActive: true, effectiveFrom: '2026-01-01', effectiveUntil: null,
    receiptNumberFormat: null, metadata: null, createdBy: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

let ledgerEntries: any[]
let allocations: any[]
let paymentUpdated: any

describe('ApplyPaymentToChannelService', () => {
  let service: ApplyPaymentToChannelService

  beforeEach(() => {
    ledgerEntries = []
    allocations = []
    paymentUpdated = null

    const mockBillingChannelsRepo = {
      getById: async () => makeChannel(),
    }

    const mockPaymentsRepo = {
      getById: async () => ({
        id: paymentId, unitId, amount: '45.00',
        currencyId, status: 'pending_verification',
      }),
      update: async (_id: string, data: any) => {
        paymentUpdated = data
        return { id: paymentId, ...data }
      },
    }

    const mockConvertService = {
      execute: async (input: any) => ({
        success: true,
        data: { convertedAmount: input.paymentAmount, exchangeRateId: null, isStaleRate: false },
      }),
    }

    const mockAppendLedgerService = {
      execute: async (input: any) => {
        const entry = { id: `e-${ledgerEntries.length + 1}`, ...input, runningBalance: '0' }
        ledgerEntries.push(entry)
        return { success: true, data: entry }
      },
    }

    const mockAllocateService = {
      execute: async () => ({
        success: true,
        data: { allocations: [{ id: 'alloc-1', allocatedAmount: '45.00' }], remaining: '0.00' },
      }),
    }

    const mockApplyLateFeeService = {
      execute: async () => ({ success: true, data: { feeAmount: '0.00', applied: false } }),
    }

    const mockApplyDiscountService = {
      execute: async () => ({ success: true, data: { discountAmount: '0.00', applied: false } }),
    }

    const mockReceiptsRepo = {
      findByUnitAndChannel: async () => [],
    }

    service = new ApplyPaymentToChannelService(
      mockBillingChannelsRepo as never,
      mockPaymentsRepo as never,
      mockConvertService as never,
      mockAppendLedgerService as never,
      mockAllocateService as never,
      mockApplyLateFeeService as never,
      mockApplyDiscountService as never,
      mockReceiptsRepo as never,
    )
  })

  it('should apply payment creating a credit ledger entry', async () => {
    const result = await service.execute({ paymentId, channelId })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(ledgerEntries.length).toBe(1)
      expect(ledgerEntries[0].entryType).toBe('credit')
      expect(ledgerEntries[0].amount).toBe('45.00')
      expect(ledgerEntries[0].referenceType).toBe('payment')
    }
  })

  it('should run FIFO allocation after ledger entry', async () => {
    const result = await service.execute({ paymentId, channelId })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.allocations.length).toBe(1)
    }
  })

  it('should update payment status to completed', async () => {
    await service.execute({ paymentId, channelId })

    expect(paymentUpdated).not.toBeNull()
    expect(paymentUpdated.status).toBe('completed')
    expect(paymentUpdated.billingChannelId).toBe(channelId)
  })

  it('should fail if payment not found', async () => {
    const svc = new ApplyPaymentToChannelService(
      { getById: async () => makeChannel() } as never,
      { getById: async () => null } as never,
      {} as never, {} as never, {} as never,
      {} as never, {} as never, {} as never,
    )

    const result = await svc.execute({ paymentId, channelId })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('NOT_FOUND')
  })

  it('should fail if channel not found', async () => {
    const svc = new ApplyPaymentToChannelService(
      { getById: async () => null } as never,
      { getById: async () => ({ id: paymentId }) } as never,
      {} as never, {} as never, {} as never,
      {} as never, {} as never, {} as never,
    )

    const result = await svc.execute({ paymentId, channelId })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('NOT_FOUND')
  })
})
