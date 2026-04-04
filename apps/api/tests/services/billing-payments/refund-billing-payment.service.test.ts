import { describe, it, expect, beforeEach } from 'bun:test'
import { RefundBillingPaymentService } from '@services/billing-payments/refund-billing-payment.service'

// ─── Mocks ───

function mockPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay-1',
    unitId: 'unit-1',
    amount: '100.00',
    currencyId: 'cur-1',
    status: 'completed',
    condominiumId: 'condo-1',
    ...overrides,
  }
}

function mockAllocation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'alloc-1',
    paymentId: 'pay-1',
    chargeId: 'charge-1',
    allocatedAmount: '50.00',
    reversed: false,
    reversedAt: null,
    ...overrides,
  }
}

function mockCharge(overrides: Record<string, unknown> = {}) {
  return {
    id: 'charge-1',
    unitId: 'unit-1',
    condominiumId: 'condo-1',
    amount: '50.00',
    paidAmount: '50.00',
    balance: '0.00',
    currencyId: 'cur-1',
    status: 'paid',
    ...overrides,
  }
}

const createMockRepos = () => ({
  paymentsRepo: {
    getById: async (id: string) => id === 'pay-1' ? mockPayment() : null,
    withTx: function() { return this },
    update: async (_id: string, data: Record<string, unknown>) => ({ ...mockPayment(), ...data }),
  } as never,
  allocationsRepo: {
    findByPayment: async () => [mockAllocation()],
    withTx: function() { return this },
    update: async () => ({}),
  } as never,
  chargesRepo: {
    getById: async () => mockCharge(),
    withTx: function() { return this },
    update: async () => ({}),
  } as never,
  appendLedgerService: {
    execute: async () => ({ success: true, data: { id: 'entry-1' } }),
  } as never,
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  } as never,
})

describe('RefundBillingPaymentService', () => {
  let service: RefundBillingPaymentService
  let repos: ReturnType<typeof createMockRepos>

  beforeEach(() => {
    repos = createMockRepos()
    service = new RefundBillingPaymentService(
      repos.db as never,
      repos.paymentsRepo,
      repos.allocationsRepo,
      repos.chargesRepo,
      repos.appendLedgerService,
    )
  })

  it('should refund a completed payment and reverse allocations', async () => {
    const result = await service.execute({
      paymentId: 'pay-1',
      refundReason: 'Error en el monto del pago',
      refundedByUserId: 'user-admin',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reversedAllocations).toBe(1)
      expect(result.data.payment.status).toBe('refunded')
    }
  })

  it('should fail if payment not found', async () => {
    const result = await service.execute({
      paymentId: 'nonexistent',
      refundReason: 'Error en el monto del pago',
      refundedByUserId: 'user-admin',
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('NOT_FOUND')
  })

  it('should fail if payment is not completed', async () => {
    repos.paymentsRepo.getById = async () => mockPayment({ status: 'pending' }) as never
    const result = await service.execute({
      paymentId: 'pay-1',
      refundReason: 'Error en el monto del pago',
      refundedByUserId: 'user-admin',
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('BAD_REQUEST')
  })

  it('should fail if refund reason is too short', async () => {
    const result = await service.execute({
      paymentId: 'pay-1',
      refundReason: 'short',
      refundedByUserId: 'user-admin',
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('BAD_REQUEST')
  })

  it('should skip already reversed allocations', async () => {
    repos.allocationsRepo.findByPayment = async () => [
      mockAllocation({ reversed: true }),
      mockAllocation({ id: 'alloc-2', chargeId: 'charge-2', reversed: false }),
    ] as never

    repos.chargesRepo.getById = async () => mockCharge({ id: 'charge-2' }) as never

    const result = await service.execute({
      paymentId: 'pay-1',
      refundReason: 'Error en el monto del pago',
      refundedByUserId: 'user-admin',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reversedAllocations).toBe(1) // only the non-reversed one
    }
  })

  it('should restore charge balance correctly on partial refund', async () => {
    let updatedCharge: Record<string, unknown> = {}
    repos.chargesRepo.update = (async (_id: string, data: Record<string, unknown>) => {
      updatedCharge = data
    }) as never

    repos.allocationsRepo.findByPayment = async () => [
      mockAllocation({ allocatedAmount: '30.00' }),
    ] as never

    repos.chargesRepo.getById = async () => mockCharge({
      amount: '50.00',
      paidAmount: '30.00',
      balance: '20.00',
      status: 'partial',
    }) as never

    const result = await service.execute({
      paymentId: 'pay-1',
      refundReason: 'Reverso parcial del pago aplicado',
      refundedByUserId: 'user-admin',
    })

    expect(result.success).toBe(true)
    expect(updatedCharge.paidAmount).toBe('0.00')
    expect(updatedCharge.balance).toBe('50.00')
    expect(updatedCharge.status).toBe('pending')
  })
})
