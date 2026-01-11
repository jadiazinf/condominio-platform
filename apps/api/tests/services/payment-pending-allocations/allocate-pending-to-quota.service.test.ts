import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPaymentPendingAllocation, TQuota } from '@packages/domain'
import { AllocatePendingToQuotaService } from '@src/services/payment-pending-allocations'

type TMockPaymentPendingAllocationsRepository = {
  getById: (id: string) => Promise<TPaymentPendingAllocation | null>
  update: (id: string, data: unknown) => Promise<TPaymentPendingAllocation | null>
}

type TMockQuotasRepository = {
  getById: (id: string) => Promise<TQuota | null>
}

describe('AllocatePendingToQuotaService', function () {
  let service: AllocatePendingToQuotaService
  let mockPaymentPendingAllocationsRepository: TMockPaymentPendingAllocationsRepository
  let mockQuotasRepository: TMockQuotasRepository

  const allocationId = '550e8400-e29b-41d4-a716-446655440001'
  const quotaId = '550e8400-e29b-41d4-a716-446655440002'
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

  const mockQuota: TQuota = {
    id: quotaId,
    unitId: '550e8400-e29b-41d4-a716-446655440010',
    paymentConceptId: '550e8400-e29b-41d4-a716-446655440011',
    periodYear: 2024,
    periodMonth: 6,
    periodDescription: 'June 2024',
    baseAmount: '150.00',
    currencyId,
    interestAmount: '0',
    amountInBaseCurrency: null,
    exchangeRateUsed: null,
    issueDate: '2024-06-01',
    dueDate: '2024-06-15',
    status: 'pending',
    paidAmount: '0',
    balance: '150.00',
    notes: null,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(function () {
    mockPaymentPendingAllocationsRepository = {
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

    mockQuotasRepository = {
      getById: async function (id: string) {
        if (id === quotaId) return mockQuota
        return null
      },
    }

    service = new AllocatePendingToQuotaService(
      mockPaymentPendingAllocationsRepository as never,
      mockQuotasRepository as never
    )
  })

  describe('execute', function () {
    it('should allocate pending amount to quota successfully', async function () {
      const result = await service.execute({
        allocationId,
        quotaId,
        allocatedByUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('allocated')
        expect(result.data.resolutionType).toBe('allocated_to_quota')
        expect(result.data.allocatedToQuotaId).toBe(quotaId)
        expect(result.data.allocatedBy).toBe(allocatedByUserId)
      }
    })

    it('should include resolution notes when provided', async function () {
      const result = await service.execute({
        allocationId,
        quotaId,
        resolutionNotes: 'Applied to next month quota',
        allocatedByUserId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.resolutionNotes).toBe('Applied to next month quota')
      }
    })

    it('should fail when allocation does not exist', async function () {
      const result = await service.execute({
        allocationId: '550e8400-e29b-41d4-a716-446655440999',
        quotaId,
        allocatedByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Pending allocation not found')
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when allocation is already resolved', async function () {
      const resolvedAllocation: TPaymentPendingAllocation = {
        ...mockPendingAllocation,
        status: 'allocated',
      }

      mockPaymentPendingAllocationsRepository.getById = async function () {
        return resolvedAllocation
      }

      const result = await service.execute({
        allocationId,
        quotaId,
        allocatedByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Allocation has already been resolved with status: allocated')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when quota does not exist', async function () {
      mockQuotasRepository.getById = async function () {
        return null
      }

      const result = await service.execute({
        allocationId,
        quotaId: '550e8400-e29b-41d4-a716-446655440999',
        allocatedByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Target quota not found')
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when quota is already paid', async function () {
      const paidQuota: TQuota = {
        ...mockQuota,
        status: 'paid',
      }

      mockQuotasRepository.getById = async function () {
        return paidQuota
      }

      const result = await service.execute({
        allocationId,
        quotaId,
        allocatedByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Cannot allocate to a quota that is already paid')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when quota is cancelled', async function () {
      const cancelledQuota: TQuota = {
        ...mockQuota,
        status: 'cancelled',
      }

      mockQuotasRepository.getById = async function () {
        return cancelledQuota
      }

      const result = await service.execute({
        allocationId,
        quotaId,
        allocatedByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Cannot allocate to a cancelled quota')
        expect(result.code).toBe('BAD_REQUEST')
      }
    })

    it('should fail when update returns null', async function () {
      mockPaymentPendingAllocationsRepository.update = async function () {
        return null
      }

      const result = await service.execute({
        allocationId,
        quotaId,
        allocatedByUserId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Failed to update allocation')
        expect(result.code).toBe('INTERNAL_ERROR')
      }
    })
  })
})
