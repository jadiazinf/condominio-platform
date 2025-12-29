import { describe, it, expect, beforeEach } from 'bun:test'
import type { TInterestConfiguration } from '@packages/domain'
import { GetConfigsByPaymentConceptService } from '@src/services/interest-configurations'

type TMockRepository = {
  getByPaymentConceptId: (paymentConceptId: string, includeInactive?: boolean) => Promise<TInterestConfiguration[]>
}

describe('GetConfigsByPaymentConceptService', function () {
  let service: GetConfigsByPaymentConceptService
  let mockRepository: TMockRepository

  const paymentConceptId = '550e8400-e29b-41d4-a716-446655440040'

  const mockConfigs: TInterestConfiguration[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      condominiumId: '550e8400-e29b-41d4-a716-446655440010',
      buildingId: null,
      paymentConceptId,
      name: 'Standard Interest',
      description: 'Standard interest rate for late payments',
      interestType: 'simple',
      interestRate: '0.05',
      fixedAmount: null,
      calculationPeriod: 'monthly',
      gracePeriodDays: 15,
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      isActive: true,
      effectiveFrom: '2024-01-01',
      effectiveTo: null,
      metadata: null,
      createdBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      condominiumId: '550e8400-e29b-41d4-a716-446655440010',
      buildingId: null,
      paymentConceptId,
      name: 'Old Interest Config',
      description: 'Deprecated interest configuration',
      interestType: 'compound',
      interestRate: '0.10',
      fixedAmount: null,
      calculationPeriod: 'monthly',
      gracePeriodDays: 10,
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      isActive: false,
      effectiveFrom: '2023-01-01',
      effectiveTo: '2023-12-31',
      metadata: null,
      createdBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByPaymentConceptId: async function (requestedPaymentConceptId: string, includeInactive?: boolean) {
        return mockConfigs.filter(function (c) {
          const matchesPaymentConcept = c.paymentConceptId === requestedPaymentConceptId
          const matchesActive = includeInactive || c.isActive
          return matchesPaymentConcept && matchesActive
        })
      },
    }
    service = new GetConfigsByPaymentConceptService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return active configs for a payment concept', async function () {
      const result = await service.execute({ paymentConceptId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every((c) => c.paymentConceptId === paymentConceptId && c.isActive)).toBe(true)
      }
    })

    it('should return all configs including inactive when includeInactive is true', async function () {
      const result = await service.execute({ paymentConceptId, includeInactive: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((c) => c.paymentConceptId === paymentConceptId)).toBe(true)
      }
    })

    it('should return empty array when payment concept has no configs', async function () {
      const result = await service.execute({ paymentConceptId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
