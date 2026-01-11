import { describe, it, expect, beforeEach } from 'bun:test'
import type { TQuotaGenerationRule } from '@packages/domain'
import { GetApplicableRuleService } from '@src/services/quota-generation-rules'

type TMockRepository = {
  getApplicableRule: (
    condominiumId: string,
    paymentConceptId: string,
    targetDate: string,
    buildingId?: string
  ) => Promise<TQuotaGenerationRule | null>
}

describe('GetApplicableRuleService', function () {
  let service: GetApplicableRuleService
  let mockRepository: TMockRepository

  const condominiumId = '550e8400-e29b-41d4-a716-446655440001'
  const buildingId = '550e8400-e29b-41d4-a716-446655440002'
  const paymentConceptId = '550e8400-e29b-41d4-a716-446655440003'
  const createdByUserId = '550e8400-e29b-41d4-a716-446655440005'

  const mockCondominiumRule: TQuotaGenerationRule = {
    id: '550e8400-e29b-41d4-a716-446655440100',
    condominiumId,
    buildingId: null,
    paymentConceptId,
    quotaFormulaId: '550e8400-e29b-41d4-a716-446655440004',
    name: 'Condominium Level Rule',
    description: null,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    isActive: true,
    createdBy: createdByUserId,
    createdAt: new Date(),
    updatedBy: null,
    updatedAt: new Date(),
    updateReason: null,
  }

  const mockBuildingRule: TQuotaGenerationRule = {
    id: '550e8400-e29b-41d4-a716-446655440101',
    condominiumId,
    buildingId,
    paymentConceptId,
    quotaFormulaId: '550e8400-e29b-41d4-a716-446655440007',
    name: 'Building Specific Rule',
    description: null,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    isActive: true,
    createdBy: createdByUserId,
    createdAt: new Date(),
    updatedBy: null,
    updatedAt: new Date(),
    updateReason: null,
  }

  beforeEach(function () {
    mockRepository = {
      getApplicableRule: async function (
        requestedCondominiumId: string,
        requestedPaymentConceptId: string,
        _targetDate: string,
        requestedBuildingId?: string
      ) {
        if (requestedCondominiumId !== condominiumId) return null
        if (requestedPaymentConceptId !== paymentConceptId) return null

        // Prioritize building-specific rule
        if (requestedBuildingId === buildingId) {
          return mockBuildingRule
        }

        return mockCondominiumRule
      },
    }

    service = new GetApplicableRuleService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return condominium-level rule when no building specified', async function () {
      const result = await service.execute({
        condominiumId,
        paymentConceptId,
        targetDate: '2024-06-15',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(mockCondominiumRule.id)
        expect(result.data.buildingId).toBeNull()
      }
    })

    it('should return building-specific rule when building is specified', async function () {
      const result = await service.execute({
        condominiumId,
        paymentConceptId,
        targetDate: '2024-06-15',
        buildingId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(mockBuildingRule.id)
        expect(result.data.buildingId).toBe(buildingId)
      }
    })

    it('should fail when no applicable rule found', async function () {
      const result = await service.execute({
        condominiumId: '550e8400-e29b-41d4-a716-446655440999',
        paymentConceptId,
        targetDate: '2024-06-15',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('No applicable rule found for the given parameters')
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when no rule exists for payment concept', async function () {
      const result = await service.execute({
        condominiumId,
        paymentConceptId: '550e8400-e29b-41d4-a716-446655440999',
        targetDate: '2024-06-15',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should fall back to condominium rule when building has no specific rule', async function () {
      mockRepository.getApplicableRule = async function (
        requestedCondominiumId: string,
        requestedPaymentConceptId: string,
        _targetDate: string,
        requestedBuildingId?: string
      ) {
        if (requestedCondominiumId !== condominiumId) return null
        if (requestedPaymentConceptId !== paymentConceptId) return null

        // Only condominium-level rule exists
        if (requestedBuildingId && requestedBuildingId !== buildingId) {
          return mockCondominiumRule
        }

        return requestedBuildingId ? null : mockCondominiumRule
      }

      const result = await service.execute({
        condominiumId,
        paymentConceptId,
        targetDate: '2024-06-15',
        buildingId: '550e8400-e29b-41d4-a716-446655440888', // Different building
      })

      // Falls back to condominium-level rule
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.buildingId).toBeNull()
      }
    })
  })
})
