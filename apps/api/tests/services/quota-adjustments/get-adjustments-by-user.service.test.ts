import { describe, it, expect, beforeEach } from 'bun:test'
import type { TQuotaAdjustment } from '@packages/domain'
import { GetAdjustmentsByUserService } from '@src/services/quota-adjustments'

type TMockRepository = {
  getByCreatedBy: (userId: string) => Promise<TQuotaAdjustment[]>
}

describe('GetAdjustmentsByUserService', function () {
  let service: GetAdjustmentsByUserService
  let mockRepository: TMockRepository

  const adminUser1 = '550e8400-e29b-41d4-a716-446655440099'
  const adminUser2 = '550e8400-e29b-41d4-a716-446655440098'

  const adjustment1: TQuotaAdjustment = {
    id: '550e8400-e29b-41d4-a716-446655440100',
    quotaId: '550e8400-e29b-41d4-a716-446655440001',
    previousAmount: '50.00',
    newAmount: '45.00',
    adjustmentType: 'discount',
    reason: 'Ajuste por admin 1',
    createdBy: adminUser1,
    createdAt: new Date('2025-01-15'),
  }

  const adjustment2: TQuotaAdjustment = {
    id: '550e8400-e29b-41d4-a716-446655440101',
    quotaId: '550e8400-e29b-41d4-a716-446655440002',
    previousAmount: '60.00',
    newAmount: '55.00',
    adjustmentType: 'discount',
    reason: 'Otro ajuste por admin 1',
    createdBy: adminUser1,
    createdAt: new Date('2025-01-20'),
  }

  const adjustment3: TQuotaAdjustment = {
    id: '550e8400-e29b-41d4-a716-446655440102',
    quotaId: '550e8400-e29b-41d4-a716-446655440003',
    previousAmount: '70.00',
    newAmount: '75.00',
    adjustmentType: 'increase',
    reason: 'Ajuste por admin 2',
    createdBy: adminUser2,
    createdAt: new Date('2025-01-10'),
  }

  beforeEach(function () {
    mockRepository = {
      getByCreatedBy: async function (userId: string) {
        if (userId === adminUser1) return [adjustment2, adjustment1]
        if (userId === adminUser2) return [adjustment3]
        return []
      },
    }

    service = new GetAdjustmentsByUserService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return adjustments made by a user with multiple adjustments', async function () {
      const result = await service.execute({ userId: adminUser1 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(a => a.createdBy === adminUser1)).toBe(true)
      }
    })

    it('should return adjustments made by a user with single adjustment', async function () {
      const result = await service.execute({ userId: adminUser2 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0]?.createdBy).toBe(adminUser2)
      }
    })

    it('should return empty array for user with no adjustments', async function () {
      const result = await service.execute({
        userId: '550e8400-e29b-41d4-a716-446655440997',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
