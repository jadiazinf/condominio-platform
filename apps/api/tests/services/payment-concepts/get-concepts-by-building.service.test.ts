import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPaymentConcept } from '@packages/domain'
import { GetConceptsByBuildingService } from '@src/services/payment-concepts'

type TMockRepository = {
  getByBuildingId: (buildingId: string, includeInactive: boolean) => Promise<TPaymentConcept[]>
}

describe('GetConceptsByBuildingService', function () {
  let service: GetConceptsByBuildingService
  let mockRepository: TMockRepository

  const buildingId = '550e8400-e29b-41d4-a716-446655440010'

  const mockConcepts: TPaymentConcept[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      condominiumId: '550e8400-e29b-41d4-a716-446655440005',
      buildingId,
      name: 'Building Maintenance',
      description: 'Building specific maintenance fee',
      conceptType: 'maintenance',
      isRecurring: true,
      recurrencePeriod: 'monthly',
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      allowsPartialPayment: true,
      latePaymentType: 'none' as const,
      latePaymentValue: null,
      latePaymentGraceDays: 0,
      earlyPaymentType: 'none' as const,
      earlyPaymentValue: null,
      earlyPaymentDaysBeforeDue: 0,
      issueDay: null,
      dueDay: null,
      effectiveFrom: null,
      effectiveUntil: null,
      isActive: true,
      metadata: null,
      createdBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      condominiumId: '550e8400-e29b-41d4-a716-446655440005',
      buildingId,
      name: 'Inactive Building Fee',
      description: 'An inactive building fee',
      conceptType: 'other',
      isRecurring: false,
      recurrencePeriod: null,
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      allowsPartialPayment: true,
      latePaymentType: 'none' as const,
      latePaymentValue: null,
      latePaymentGraceDays: 0,
      earlyPaymentType: 'none' as const,
      earlyPaymentValue: null,
      earlyPaymentDaysBeforeDue: 0,
      issueDay: null,
      dueDay: null,
      effectiveFrom: null,
      effectiveUntil: null,
      isActive: false,
      metadata: null,
      createdBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByBuildingId: async function (requestedBuildingId: string, includeInactive: boolean) {
        return mockConcepts.filter(function (c) {
          const matchesBuilding = c.buildingId === requestedBuildingId
          const matchesActive = includeInactive || c.isActive
          return matchesBuilding && matchesActive
        })
      },
    }
    service = new GetConceptsByBuildingService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return active concepts for a building', async function () {
      const result = await service.execute({ buildingId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every(c => c.buildingId === buildingId && c.isActive)).toBe(true)
      }
    })

    it('should return all concepts including inactive when includeInactive is true', async function () {
      const result = await service.execute({ buildingId, includeInactive: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(c => c.buildingId === buildingId)).toBe(true)
      }
    })

    it('should return empty array when building has no concepts', async function () {
      const result = await service.execute({ buildingId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
