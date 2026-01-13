import { describe, it, expect, beforeEach } from 'bun:test'
import type { TInterestConfiguration } from '@packages/domain'
import { GetActiveConfigForDateService } from '@src/services/interest-configurations'

type TMockRepository = {
  getActiveForDate: (
    paymentConceptId: string,
    date: string
  ) => Promise<TInterestConfiguration | null>
}

describe('GetActiveConfigForDateService', function () {
  let service: GetActiveConfigForDateService
  let mockRepository: TMockRepository

  const paymentConceptId = '550e8400-e29b-41d4-a716-446655440040'

  const mockConfigs: TInterestConfiguration[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      condominiumId: '550e8400-e29b-41d4-a716-446655440010',
      buildingId: null,
      paymentConceptId,
      name: 'Standard Interest 2024',
      description: 'Standard interest rate for 2024',
      interestType: 'simple',
      interestRate: '0.05',
      fixedAmount: null,
      calculationPeriod: 'monthly',
      gracePeriodDays: 15,
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      isActive: true,
      effectiveFrom: '2024-01-01',
      effectiveTo: '2024-12-31',
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
      name: 'Standard Interest 2023',
      description: 'Standard interest rate for 2023',
      interestType: 'compound',
      interestRate: '0.10',
      fixedAmount: null,
      calculationPeriod: 'monthly',
      gracePeriodDays: 10,
      currencyId: '550e8400-e29b-41d4-a716-446655440050',
      isActive: true,
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
      getActiveForDate: async function (requestedPaymentConceptId: string, date: string) {
        const found = mockConfigs.find(function (c) {
          const matchesPaymentConcept = c.paymentConceptId === requestedPaymentConceptId
          const isWithinEffectivePeriod =
            c.effectiveFrom <= date && (c.effectiveTo === null || c.effectiveTo >= date)
          return matchesPaymentConcept && c.isActive && isWithinEffectivePeriod
        })
        return found ?? null
      },
    }
    service = new GetActiveConfigForDateService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return active config for date within 2024 period', async function () {
      const result = await service.execute({
        paymentConceptId,
        date: '2024-06-15',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toBeNull()
        expect(result.data!.name).toBe('Standard Interest 2024')
        expect(result.data!.paymentConceptId).toBe(paymentConceptId)
      }
    })

    it('should return active config for date within 2023 period', async function () {
      const result = await service.execute({
        paymentConceptId,
        date: '2023-06-15',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toBeNull()
        expect(result.data!.name).toBe('Standard Interest 2023')
        expect(result.data!.paymentConceptId).toBe(paymentConceptId)
      }
    })

    it('should return null when no config is active for the date', async function () {
      const result = await service.execute({
        paymentConceptId,
        date: '2022-06-15',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('should return null when payment concept has no configs', async function () {
      const result = await service.execute({
        paymentConceptId: '550e8400-e29b-41d4-a716-446655440099',
        date: '2024-06-15',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })
  })
})
