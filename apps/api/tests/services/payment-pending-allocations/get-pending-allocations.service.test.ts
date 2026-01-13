import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPaymentPendingAllocation } from '@packages/domain'
import { GetPendingAllocationsService } from '@src/services/payment-pending-allocations'

type TMockRepository = {
  getPendingAllocations: () => Promise<TPaymentPendingAllocation[]>
  getPendingByPaymentId: (paymentId: string) => Promise<TPaymentPendingAllocation[]>
}

describe('GetPendingAllocationsService', function () {
  let service: GetPendingAllocationsService
  let mockRepository: TMockRepository

  const paymentId1 = '550e8400-e29b-41d4-a716-446655440001'
  const paymentId2 = '550e8400-e29b-41d4-a716-446655440002'
  const currencyId = '550e8400-e29b-41d4-a716-446655440004'

  const mockPendingAllocations: TPaymentPendingAllocation[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440100',
      paymentId: paymentId1,
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
      paymentId: paymentId1,
      pendingAmount: '25.00',
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
      id: '550e8400-e29b-41d4-a716-446655440102',
      paymentId: paymentId2,
      pendingAmount: '100.00',
      currencyId,
      status: 'pending',
      resolutionType: null,
      resolutionNotes: null,
      allocatedToQuotaId: null,
      createdAt: new Date(),
      allocatedBy: null,
      allocatedAt: null,
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getPendingAllocations: async function () {
        return mockPendingAllocations
      },
      getPendingByPaymentId: async function (paymentId: string) {
        return mockPendingAllocations.filter(function (a) {
          return a.paymentId === paymentId
        })
      },
    }

    service = new GetPendingAllocationsService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all pending allocations when no filter provided', async function () {
      const result = await service.execute({})

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(3)
        expect(result.data.every(a => a.status === 'pending')).toBe(true)
      }
    })

    it('should return pending allocations for specific payment', async function () {
      const result = await service.execute({ paymentId: paymentId1 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(a => a.paymentId === paymentId1)).toBe(true)
      }
    })

    it('should return empty array when no pending allocations for payment', async function () {
      const result = await service.execute({
        paymentId: '550e8400-e29b-41d4-a716-446655440999',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })

    it('should return single allocation for payment with one pending', async function () {
      const result = await service.execute({ paymentId: paymentId2 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0]?.paymentId).toBe(paymentId2)
        expect(result.data[0]?.pendingAmount).toBe('100.00')
      }
    })
  })
})
