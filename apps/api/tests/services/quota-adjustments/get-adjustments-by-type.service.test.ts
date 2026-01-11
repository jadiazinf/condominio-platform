import { describe, it, expect, beforeEach } from 'bun:test'
import type { TQuotaAdjustment, TAdjustmentType } from '@packages/domain'
import { GetAdjustmentsByTypeService } from '@src/services/quota-adjustments'

type TMockRepository = {
  getByType: (adjustmentType: TAdjustmentType) => Promise<TQuotaAdjustment[]>
}

describe('GetAdjustmentsByTypeService', function () {
  let service: GetAdjustmentsByTypeService
  let mockRepository: TMockRepository

  const discountAdjustment1: TQuotaAdjustment = {
    id: '550e8400-e29b-41d4-a716-446655440100',
    quotaId: '550e8400-e29b-41d4-a716-446655440001',
    previousAmount: '100.00',
    newAmount: '90.00',
    adjustmentType: 'discount',
    reason: 'Descuento por pronto pago',
    createdBy: '550e8400-e29b-41d4-a716-446655440099',
    createdAt: new Date('2025-01-15'),
  }

  const discountAdjustment2: TQuotaAdjustment = {
    id: '550e8400-e29b-41d4-a716-446655440101',
    quotaId: '550e8400-e29b-41d4-a716-446655440002',
    previousAmount: '80.00',
    newAmount: '70.00',
    adjustmentType: 'discount',
    reason: 'Descuento especial',
    createdBy: '550e8400-e29b-41d4-a716-446655440099',
    createdAt: new Date('2025-01-20'),
  }

  const increaseAdjustment: TQuotaAdjustment = {
    id: '550e8400-e29b-41d4-a716-446655440102',
    quotaId: '550e8400-e29b-41d4-a716-446655440003',
    previousAmount: '50.00',
    newAmount: '60.00',
    adjustmentType: 'increase',
    reason: 'Ajuste por inflación',
    createdBy: '550e8400-e29b-41d4-a716-446655440098',
    createdAt: new Date('2025-01-10'),
  }

  const correctionAdjustment: TQuotaAdjustment = {
    id: '550e8400-e29b-41d4-a716-446655440103',
    quotaId: '550e8400-e29b-41d4-a716-446655440004',
    previousAmount: '120.00',
    newAmount: '100.00',
    adjustmentType: 'correction',
    reason: 'Corrección de error de cálculo',
    createdBy: '550e8400-e29b-41d4-a716-446655440097',
    createdAt: new Date('2025-01-12'),
  }

  const waiverAdjustment: TQuotaAdjustment = {
    id: '550e8400-e29b-41d4-a716-446655440104',
    quotaId: '550e8400-e29b-41d4-a716-446655440005',
    previousAmount: '75.00',
    newAmount: '0.00',
    adjustmentType: 'waiver',
    reason: 'Condonación por situación especial',
    createdBy: '550e8400-e29b-41d4-a716-446655440096',
    createdAt: new Date('2025-01-18'),
  }

  beforeEach(function () {
    mockRepository = {
      getByType: async function (adjustmentType: TAdjustmentType) {
        const allAdjustments = [
          discountAdjustment1,
          discountAdjustment2,
          increaseAdjustment,
          correctionAdjustment,
          waiverAdjustment,
        ]
        return allAdjustments.filter(a => a.adjustmentType === adjustmentType)
      },
    }

    service = new GetAdjustmentsByTypeService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all discount adjustments', async function () {
      const result = await service.execute({ adjustmentType: 'discount' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(a => a.adjustmentType === 'discount')).toBe(true)
      }
    })

    it('should return all increase adjustments', async function () {
      const result = await service.execute({ adjustmentType: 'increase' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0]?.adjustmentType).toBe('increase')
        expect(result.data[0]?.id).toBe(increaseAdjustment.id)
      }
    })

    it('should return all correction adjustments', async function () {
      const result = await service.execute({ adjustmentType: 'correction' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0]?.adjustmentType).toBe('correction')
        expect(result.data[0]?.id).toBe(correctionAdjustment.id)
      }
    })

    it('should return all waiver adjustments', async function () {
      const result = await service.execute({ adjustmentType: 'waiver' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0]?.adjustmentType).toBe('waiver')
        expect(result.data[0]?.newAmount).toBe('0.00')
      }
    })

    it('should return empty array when no adjustments of type exist', async function () {
      mockRepository.getByType = async function () {
        return []
      }

      const result = await service.execute({ adjustmentType: 'discount' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
