import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPaymentConcept } from '@packages/domain'
import { GetConceptsByCondominiumService } from '@src/services/payment-concepts'

type TMockRepository = {
  getByCondominiumId: (
    condominiumId: string,
    includeInactive: boolean
  ) => Promise<TPaymentConcept[]>
}

describe('GetConceptsByCondominiumService', function () {
  let service: GetConceptsByCondominiumService
  let mockRepository: TMockRepository

  const condominiumId = '550e8400-e29b-41d4-a716-446655440010'

  const mockConcepts: TPaymentConcept[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      condominiumId,
      buildingId: null,
      name: 'Monthly Maintenance',
      description: 'Regular maintenance fee',
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
      isActive: true,
      metadata: null,
      createdBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      condominiumId,
      buildingId: null,
      name: 'Inactive Fee',
      description: 'An inactive fee',
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
      isActive: false,
      metadata: null,
      createdBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByCondominiumId: async function (
        requestedCondominiumId: string,
        includeInactive: boolean
      ) {
        return mockConcepts.filter(function (c) {
          const matchesCondominium = c.condominiumId === requestedCondominiumId
          const matchesActive = includeInactive || c.isActive
          return matchesCondominium && matchesActive
        })
      },
    }
    service = new GetConceptsByCondominiumService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return active concepts for a condominium', async function () {
      const result = await service.execute({ condominiumId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every(c => c.condominiumId === condominiumId && c.isActive)).toBe(true)
      }
    })

    it('should return all concepts including inactive when includeInactive is true', async function () {
      const result = await service.execute({ condominiumId, includeInactive: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(c => c.condominiumId === condominiumId)).toBe(true)
      }
    })

    it('should return empty array when condominium has no concepts', async function () {
      const result = await service.execute({
        condominiumId: '550e8400-e29b-41d4-a716-446655440099',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
