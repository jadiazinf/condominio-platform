import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPaymentConcept } from '@packages/domain'
import { GetConceptsByTypeService } from '@src/services/payment-concepts'

type TMockRepository = {
  getByConceptType: (
    conceptType: TPaymentConcept['conceptType'],
    includeInactive: boolean
  ) => Promise<TPaymentConcept[]>
}

describe('GetConceptsByTypeService', function () {
  let service: GetConceptsByTypeService
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
      buildingId: null,
      name: 'Late Payment Fine',
      description: 'Fine for late payment',
      conceptType: 'fine',
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
      isActive: true,
      metadata: null,
      createdBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      condominiumId: '550e8400-e29b-41d4-a716-446655440005',
      buildingId: null,
      name: 'Inactive Maintenance',
      description: 'Old maintenance fee',
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
      isActive: false,
      metadata: null,
      createdBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByConceptType: async function (
        conceptType: TPaymentConcept['conceptType'],
        includeInactive: boolean
      ) {
        return mockConcepts.filter(function (c) {
          const matchesType = c.conceptType === conceptType
          const matchesActive = includeInactive || c.isActive
          return matchesType && matchesActive
        })
      },
    }
    service = new GetConceptsByTypeService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return active concepts of maintenance type', async function () {
      const result = await service.execute({ conceptType: 'maintenance' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every(c => c.conceptType === 'maintenance' && c.isActive)).toBe(true)
      }
    })

    it('should return active concepts of fine type', async function () {
      const result = await service.execute({ conceptType: 'fine' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every(c => c.conceptType === 'fine' && c.isActive)).toBe(true)
      }
    })

    it('should return all concepts including inactive when includeInactive is true', async function () {
      const result = await service.execute({ conceptType: 'maintenance', includeInactive: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(c => c.conceptType === 'maintenance')).toBe(true)
      }
    })

    it('should return empty array when no concepts match type', async function () {
      const result = await service.execute({ conceptType: 'extraordinary' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
