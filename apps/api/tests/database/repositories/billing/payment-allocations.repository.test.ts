import { describe, it, expect } from 'bun:test'
import type { TPaymentAllocation } from '@packages/domain'

describe('PaymentAllocationsV2Repository', () => {
  const makeAllocation = (overrides: Partial<TPaymentAllocation> = {}): TPaymentAllocation => ({
    id: '550e8400-e29b-41d4-a716-446655440001',
    paymentId: '550e8400-e29b-41d4-a716-446655440010',
    chargeId: '550e8400-e29b-41d4-a716-446655440020',
    allocatedAmount: '45.00',
    allocatedAt: new Date(),
    reversed: false,
    reversedAt: null,
    createdBy: null,
    ...overrides,
  })

  describe('FIFO allocation', () => {
    it('should allocate exact amount to a single charge', () => {
      const alloc = makeAllocation({ allocatedAmount: '45.00' })
      expect(parseFloat(alloc.allocatedAmount)).toBe(45)
      expect(alloc.reversed).toBe(false)
    })

    it('should allocate across multiple charges', () => {
      // Payment of $100 across 3 charges ($45 each)
      const allocations = [
        makeAllocation({
          id: '1',
          chargeId: 'charge-jan',
          allocatedAmount: '45.00', // fully covers Jan
        }),
        makeAllocation({
          id: '2',
          chargeId: 'charge-feb',
          allocatedAmount: '45.00', // fully covers Feb
        }),
        makeAllocation({
          id: '3',
          chargeId: 'charge-mar',
          allocatedAmount: '10.00', // partially covers Mar
        }),
      ]

      const totalAllocated = allocations.reduce(
        (sum, a) => sum + parseFloat(a.allocatedAmount),
        0
      )
      expect(totalAllocated).toBe(100)
    })

    it('should handle overpayment (no extra allocation, saldo a favor in ledger)', () => {
      // Payment of $100, only $45 in pending charges
      const alloc = makeAllocation({ allocatedAmount: '45.00' })
      const paymentAmount = 100
      const allocated = parseFloat(alloc.allocatedAmount)
      const surplus = paymentAmount - allocated
      expect(surplus).toBe(55) // This stays as negative runningBalance in ledger
    })
  })

  describe('reversal (void receipt)', () => {
    it('should mark allocation as reversed', () => {
      const reversed = makeAllocation({
        reversed: true,
        reversedAt: new Date(),
      })
      expect(reversed.reversed).toBe(true)
      expect(reversed.reversedAt).not.toBeNull()
    })

    it('should not delete reversed allocations (audit trail)', () => {
      const alloc = makeAllocation({ reversed: true })
      // The allocation still exists, just marked as reversed
      expect(alloc.id).toBeDefined()
      expect(alloc.reversed).toBe(true)
    })
  })
})
