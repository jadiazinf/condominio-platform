import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPaymentPendingAllocation } from '@packages/domain'
import { GetAllocationsByPaymentService } from '@src/services/payment-pending-allocations'

type TMockRepository = {
  getByPaymentId: (paymentId: string) => Promise<TPaymentPendingAllocation[]>
}

describe('GetAllocationsByPaymentService', function () {
  let service: GetAllocationsByPaymentService
  let mockRepository: TMockRepository

  const paymentId = '550e8400-e29b-41d4-a716-446655440001'
  const currencyId = '550e8400-e29b-41d4-a716-446655440004'

  const mockAllocations: TPaymentPendingAllocation[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440100',
      paymentId,
      pendingAmount: '50.00',
      currencyId,
      status: 'pending',
      resolutionType: null,
      resolutionNotes: null,
      allocatedToQuotaId: null,
      createdAt: new Date(),
      allocatedBy: null,
      allocatedAt: null,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440101',
      paymentId,
      pendingAmount: '25.00',
      currencyId,
      status: 'allocated',
      resolutionType: 'allocated_to_quota',
      resolutionNotes: 'Applied to next month',
      allocatedToQuotaId: '550e8400-e29b-41d4-a716-446655440200',
      createdAt: new Date(),
      allocatedBy: '550e8400-e29b-41d4-a716-446655440005',
      allocatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440102',
      paymentId,
      pendingAmount: '10.00',
      currencyId,
      status: 'refunded',
      resolutionType: 'refunded',
      resolutionNotes: 'Refund processed',
      allocatedToQuotaId: null,
      createdAt: new Date(),
      allocatedBy: '550e8400-e29b-41d4-a716-446655440005',
      allocatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByPaymentId: async function (requestedPaymentId: string) {
        return mockAllocations.filter(function (a) {
          return a.paymentId === requestedPaymentId
        })
      },
    }

    service = new GetAllocationsByPaymentService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all allocations for payment regardless of status', async function () {
      const result = await service.execute({ paymentId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(3)
      }
    })

    it('should include pending allocations', async function () {
      const result = await service.execute({ paymentId })

      expect(result.success).toBe(true)
      if (result.success) {
        const pending = result.data.filter(a => a.status === 'pending')
        expect(pending.length).toBeGreaterThan(0)
      }
    })

    it('should include allocated allocations', async function () {
      const result = await service.execute({ paymentId })

      expect(result.success).toBe(true)
      if (result.success) {
        const allocated = result.data.filter(a => a.status === 'allocated')
        expect(allocated.length).toBeGreaterThan(0)
        expect(allocated[0]?.resolutionType).toBe('allocated_to_quota')
      }
    })

    it('should include refunded allocations', async function () {
      const result = await service.execute({ paymentId })

      expect(result.success).toBe(true)
      if (result.success) {
        const refunded = result.data.filter(a => a.status === 'refunded')
        expect(refunded.length).toBeGreaterThan(0)
        expect(refunded[0]?.resolutionType).toBe('refunded')
      }
    })

    it('should return empty array when payment has no allocations', async function () {
      const result = await service.execute({
        paymentId: '550e8400-e29b-41d4-a716-446655440999',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })

    it('should return allocations belonging to specified payment only', async function () {
      const result = await service.execute({ paymentId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.every(a => a.paymentId === paymentId)).toBe(true)
      }
    })
  })
})
