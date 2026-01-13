import { describe, it, expect, beforeEach } from 'bun:test'
import type { TQuotaGenerationRule } from '@packages/domain'
import { GetRulesByCondominiumService } from '@src/services/quota-generation-rules'

type TMockRepository = {
  getByCondominiumId: (
    condominiumId: string,
    includeInactive: boolean
  ) => Promise<TQuotaGenerationRule[]>
}

describe('GetRulesByCondominiumService', function () {
  let service: GetRulesByCondominiumService
  let mockRepository: TMockRepository

  const condominiumId = '550e8400-e29b-41d4-a716-446655440001'
  const createdByUserId = '550e8400-e29b-41d4-a716-446655440005'

  const mockRules: TQuotaGenerationRule[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440100',
      condominiumId,
      buildingId: null,
      paymentConceptId: '550e8400-e29b-41d4-a716-446655440003',
      quotaFormulaId: '550e8400-e29b-41d4-a716-446655440004',
      name: 'Monthly Fee Rule',
      description: null,
      effectiveFrom: '2024-01-01',
      effectiveTo: null,
      isActive: true,
      createdBy: createdByUserId,
      createdAt: new Date(),
      updatedBy: null,
      updatedAt: new Date(),
      updateReason: null,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440101',
      condominiumId,
      buildingId: '550e8400-e29b-41d4-a716-446655440002',
      paymentConceptId: '550e8400-e29b-41d4-a716-446655440003',
      quotaFormulaId: '550e8400-e29b-41d4-a716-446655440004',
      name: 'Building A Rule',
      description: 'Specific to building A',
      effectiveFrom: '2024-01-01',
      effectiveTo: '2024-12-31',
      isActive: true,
      createdBy: createdByUserId,
      createdAt: new Date(),
      updatedBy: null,
      updatedAt: new Date(),
      updateReason: null,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440102',
      condominiumId,
      buildingId: null,
      paymentConceptId: '550e8400-e29b-41d4-a716-446655440006',
      quotaFormulaId: '550e8400-e29b-41d4-a716-446655440004',
      name: 'Inactive Rule',
      description: null,
      effectiveFrom: '2023-01-01',
      effectiveTo: '2023-12-31',
      isActive: false,
      createdBy: createdByUserId,
      createdAt: new Date(),
      updatedBy: null,
      updatedAt: new Date(),
      updateReason: null,
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByCondominiumId: async function (
        requestedCondominiumId: string,
        includeInactive: boolean
      ) {
        const filtered = mockRules.filter(function (r) {
          return r.condominiumId === requestedCondominiumId
        })

        if (includeInactive) {
          return filtered
        }

        return filtered.filter(function (r) {
          return r.isActive
        })
      },
    }

    service = new GetRulesByCondominiumService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return only active rules by default', async function () {
      const result = await service.execute({ condominiumId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(r => r.isActive)).toBe(true)
      }
    })

    it('should return all rules including inactive when requested', async function () {
      const result = await service.execute({
        condominiumId,
        includeInactive: true,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(3)
        expect(result.data.some(r => !r.isActive)).toBe(true)
      }
    })

    it('should return empty array when condominium has no rules', async function () {
      const result = await service.execute({
        condominiumId: '550e8400-e29b-41d4-a716-446655440999',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })

    it('should return rules belonging to the specified condominium only', async function () {
      const result = await service.execute({ condominiumId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.every(r => r.condominiumId === condominiumId)).toBe(true)
      }
    })

    it('should include both condominium and building-level rules', async function () {
      const result = await service.execute({ condominiumId })

      expect(result.success).toBe(true)
      if (result.success) {
        const condominiumLevelRules = result.data.filter(r => r.buildingId === null)
        const buildingLevelRules = result.data.filter(r => r.buildingId !== null)

        expect(condominiumLevelRules.length).toBeGreaterThan(0)
        expect(buildingLevelRules.length).toBeGreaterThan(0)
      }
    })
  })
})
