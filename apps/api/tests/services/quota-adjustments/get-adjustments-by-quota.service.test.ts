import { describe, it, expect, beforeEach } from 'bun:test'
import type { TQuotaAdjustment } from '@packages/domain'
import { GetAdjustmentsByQuotaService } from '@src/services/quota-adjustments'

type TMockRepository = {
  getByQuotaId: (quotaId: string) => Promise<TQuotaAdjustment[]>
}

describe('GetAdjustmentsByQuotaService', function () {
  let service: GetAdjustmentsByQuotaService
  let mockRepository: TMockRepository

  const quotaId1 = '550e8400-e29b-41d4-a716-446655440001'
  const quotaId2 = '550e8400-e29b-41d4-a716-446655440002'
  const adminUserId = '550e8400-e29b-41d4-a716-446655440099'

  const adjustment1: TQuotaAdjustment = {
    id: '550e8400-e29b-41d4-a716-446655440100',
    quotaId: quotaId1,
    previousAmount: '50.00',
    newAmount: '45.00',
    adjustmentType: 'discount',
    reason: 'Primera rebaja',
    createdBy: adminUserId,
    createdAt: new Date('2025-01-15'),
  }

  const adjustment2: TQuotaAdjustment = {
    id: '550e8400-e29b-41d4-a716-446655440101',
    quotaId: quotaId1,
    previousAmount: '45.00',
    newAmount: '40.00',
    adjustmentType: 'discount',
    reason: 'Segunda rebaja',
    createdBy: adminUserId,
    createdAt: new Date('2025-01-20'),
  }

  const adjustment3: TQuotaAdjustment = {
    id: '550e8400-e29b-41d4-a716-446655440102',
    quotaId: quotaId2,
    previousAmount: '60.00',
    newAmount: '65.00',
    adjustmentType: 'increase',
    reason: 'Corrección',
    createdBy: adminUserId,
    createdAt: new Date('2025-01-10'),
  }

  beforeEach(function () {
    mockRepository = {
      getByQuotaId: async function (quotaId: string) {
        if (quotaId === quotaId1) return [adjustment2, adjustment1] // ordered by date desc
        if (quotaId === quotaId2) return [adjustment3]
        return []
      },
    }

    service = new GetAdjustmentsByQuotaService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return adjustments for a quota with multiple adjustments', async function () {
      const result = await service.execute({ quotaId: quotaId1 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data[0]?.id).toBe(adjustment2.id) // most recent first
        expect(result.data[1]?.id).toBe(adjustment1.id)
      }
    })

    it('should return adjustments for a quota with single adjustment', async function () {
      const result = await service.execute({ quotaId: quotaId2 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0]?.id).toBe(adjustment3.id)
      }
    })

    it('should return empty array for quota with no adjustments', async function () {
      const result = await service.execute({
        quotaId: '550e8400-e29b-41d4-a716-446655440999',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
