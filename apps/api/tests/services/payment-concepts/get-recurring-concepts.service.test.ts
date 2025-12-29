import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPaymentConcept } from '@packages/domain'
import { GetRecurringConceptsService } from '@src/services/payment-concepts'

type TMockRepository = {
  getRecurringConcepts: (includeInactive: boolean) => Promise<TPaymentConcept[]>
}

describe('GetRecurringConceptsService', function () {
  let service: GetRecurringConceptsService
  let mockRepository: TMockRepository

  const mockConcepts: TPaymentConcept[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      condominiumId: '550e8400-e29b-41d4-a716-446655440005',
      buildingId: null,
      name: 'Monthly Maintenance',
      description: 'Regular maintenance fee',
      conceptType: 'maintenance',
      isRecurring: true,
      recurrencePeriod: 'monthly',
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      isActive: true,
      metadata: null,
      createdBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      condominiumId: '550e8400-e29b-41d4-a716-446655440005',
      buildingId: null,
      name: 'Quarterly Fee',
      description: 'Quarterly service fee',
      conceptType: 'condominium_fee',
      isRecurring: true,
      recurrencePeriod: 'quarterly',
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      isActive: false,
      metadata: null,
      createdBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getRecurringConcepts: async function (includeInactive: boolean) {
        return mockConcepts.filter(function (c) {
          const matchesRecurring = c.isRecurring
          const matchesActive = includeInactive || c.isActive
          return matchesRecurring && matchesActive
        })
      },
    }
    service = new GetRecurringConceptsService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return active recurring concepts', async function () {
      const result = await service.execute({})

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every((c) => c.isRecurring && c.isActive)).toBe(true)
      }
    })

    it('should return all recurring concepts including inactive when includeInactive is true', async function () {
      const result = await service.execute({ includeInactive: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((c) => c.isRecurring)).toBe(true)
      }
    })

    it('should work with no input parameter', async function () {
      const result = await service.execute()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every((c) => c.isRecurring && c.isActive)).toBe(true)
      }
    })
  })
})
