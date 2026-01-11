import { describe, it, expect, beforeEach } from 'bun:test'
import type { TQuotaGenerationRule } from '@packages/domain'
import { GetEffectiveRulesForDateService } from '@src/services/quota-generation-rules'

type TMockRepository = {
  getEffectiveRulesForDate: (condominiumId: string, targetDate: string) => Promise<TQuotaGenerationRule[]>
}

describe('GetEffectiveRulesForDateService', function () {
  let service: GetEffectiveRulesForDateService
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
      name: 'Always Active Rule',
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
      buildingId: null,
      paymentConceptId: '550e8400-e29b-41d4-a716-446655440006',
      quotaFormulaId: '550e8400-e29b-41d4-a716-446655440004',
      name: 'First Half 2024 Rule',
      description: null,
      effectiveFrom: '2024-01-01',
      effectiveTo: '2024-06-30',
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
      quotaFormulaId: '550e8400-e29b-41d4-a716-446655440007',
      name: 'Second Half 2024 Rule',
      description: null,
      effectiveFrom: '2024-07-01',
      effectiveTo: '2024-12-31',
      isActive: true,
      createdBy: createdByUserId,
      createdAt: new Date(),
      updatedBy: null,
      updatedAt: new Date(),
      updateReason: null,
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getEffectiveRulesForDate: async function (requestedCondominiumId: string, targetDate: string) {
        if (requestedCondominiumId !== condominiumId) return []

        return mockRules.filter(function (rule) {
          // Check if rule is effective on targetDate
          const effectiveFrom = rule.effectiveFrom
          const effectiveTo = rule.effectiveTo

          if (targetDate < effectiveFrom) return false
          if (effectiveTo && targetDate > effectiveTo) return false

          return rule.isActive
        })
      },
    }

    service = new GetEffectiveRulesForDateService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return rules effective on the target date', async function () {
      const result = await service.execute({
        condominiumId,
        targetDate: '2024-03-15',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        const ruleNames = result.data.map((r) => r.name)
        expect(ruleNames).toContain('Always Active Rule')
        expect(ruleNames).toContain('First Half 2024 Rule')
      }
    })

    it('should return different rules for different dates', async function () {
      const result = await service.execute({
        condominiumId,
        targetDate: '2024-09-15',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        const ruleNames = result.data.map((r) => r.name)
        expect(ruleNames).toContain('Always Active Rule')
        expect(ruleNames).toContain('Second Half 2024 Rule')
        expect(ruleNames).not.toContain('First Half 2024 Rule')
      }
    })

    it('should return only the always-active rule after bounded rules expire', async function () {
      const result = await service.execute({
        condominiumId,
        targetDate: '2025-03-15',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0]?.name).toBe('Always Active Rule')
      }
    })

    it('should return empty array before any rules are effective', async function () {
      const result = await service.execute({
        condominiumId,
        targetDate: '2023-06-15',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })

    it('should return empty array for non-existent condominium', async function () {
      const result = await service.execute({
        condominiumId: '550e8400-e29b-41d4-a716-446655440999',
        targetDate: '2024-06-15',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })

    it('should include rules where target date is on boundary (effectiveFrom)', async function () {
      const result = await service.execute({
        condominiumId,
        targetDate: '2024-01-01',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
      }
    })

    it('should include rules where target date is on boundary (effectiveTo)', async function () {
      const result = await service.execute({
        condominiumId,
        targetDate: '2024-06-30',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        const ruleNames = result.data.map((r) => r.name)
        expect(ruleNames).toContain('First Half 2024 Rule')
      }
    })
  })
})
