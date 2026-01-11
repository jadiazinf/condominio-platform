import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPaymentPendingAllocation } from '@packages/domain'
import { RefundPendingAllocationService } from '@src/services/payment-pending-allocations'

type TMockRepository = {
  getById: (id: string) => Promise<TPaymentPendingAllocation | null>
  update: (id: string, data: unknown) => Promise<TPaymentPendingAllocation | null>
}

describe('RefundPendingAllocationService', function () {
  let service: RefundPendingAllocationService
  let mockRepository: TMockRepository

  const allocationId = '550e8400-e29b-41d4-a716-446655440001'
  const paymentId = '550e8400-e29b-41d4-a716-446655440003'
  const currencyId = '550e8400-e29b-41d4-a716-446655440004'
  const allocatedByUserId = '550e8400-e29b-41d4-a716-446655440005'

  const mockPendingAllocation: TPaymentPendingAllocation = {
    id: allocationId,
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
  }

  beforeEach(function () {
    mockRepository = {
      getById: async function (id: string) {
        if (id === allocationId) return mockPendingAllocation
        return null
      },
      update: async function (id: string, data: unknown) {
        if (id === allocationId) {
          return { ...mockPendingAllocation, ...(data as object) }
        }
        return null
      },
    }

    service = new RefundPendingAllocationService(mockRepository as never)
  })

  describe('execute', function () {
    it('should refund allocation successfully', async function () {
      const result = await service.execute({
        allocationId,
        resolutionNotes: 'Refund processed via bank transfer',
        allocatedByUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('refunded')
        expect(result.data.resolutionType).toBe('refunded')
        expect(result.data.resolutionNotes).toBe('Refund processed via bank transfer')
        expect(result.data.allocatedBy).toBe(allocatedByUserId)
      }
    })

    it('should fail when allocation does not exist', async function () {
      const result = await service.execute({
        allocationId: '550e8400-e29b-41d4-a716-446655440999',
        resolutionNotes: 'Refund reason',
        allocatedByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Pending allocation not found')
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when allocation is already resolved', async function () {
      const refundedAllocation: TPaymentPendingAllocation = {
        ...mockPendingAllocation,
        status: 'refunded',
      }

      mockRepository.getById = async function () {
        return refundedAllocation
      }

      const result = await service.execute({
        allocationId,
        resolutionNotes: 'Another refund',
        allocatedByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Allocation has already been resolved with status: refunded')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when resolution notes are empty', async function () {
      const result = await service.execute({
        allocationId,
        resolutionNotes: '',
        allocatedByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Resolution notes are required for refund')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when resolution notes are only whitespace', async function () {
      const result = await service.execute({
        allocationId,
        resolutionNotes: '   ',
        allocatedByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Resolution notes are required for refund')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when update returns null', async function () {
      mockRepository.update = async function () {
        return null
      }

      const result = await service.execute({
        allocationId,
        resolutionNotes: 'Refund processed',
        allocatedByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Failed to update allocation')
        expect(result.code).toBe('INTERNAL_ERROR')
      }
    })

    it('should fail when allocation status is allocated', async function () {
      const allocatedAllocation: TPaymentPendingAllocation = {
        ...mockPendingAllocation,
        status: 'allocated',
      }

      mockRepository.getById = async function () {
        return allocatedAllocation
      }

      const result = await service.execute({
        allocationId,
        resolutionNotes: 'Trying to refund allocated',
        allocatedByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Allocation has already been resolved with status: allocated')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })
  })
})
