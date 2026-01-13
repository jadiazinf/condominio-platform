import { describe, it, expect, beforeEach } from 'bun:test'
import type { TExchangeRate } from '@packages/domain'
import { GetRatesByDateService } from '@src/services/exchange-rates'

type TMockRepository = {
  getByDate: (effectiveDate: string) => Promise<TExchangeRate[]>
}

describe('GetRatesByDateService', function () {
  let service: GetRatesByDateService
  let mockRepository: TMockRepository

  const effectiveDate = '2024-01-15'

  const mockExchangeRates: TExchangeRate[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      fromCurrencyId: '550e8400-e29b-41d4-a716-446655440001',
      toCurrencyId: '550e8400-e29b-41d4-a716-446655440002',
      rate: '36.50',
      effectiveDate,
      source: 'BCV',
      createdAt: new Date(),
      createdBy: null,
      registeredBy: null,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440011',
      fromCurrencyId: '550e8400-e29b-41d4-a716-446655440003',
      toCurrencyId: '550e8400-e29b-41d4-a716-446655440002',
      rate: '1.10',
      effectiveDate,
      source: 'BCV',
      createdAt: new Date(),
      createdBy: null,
      registeredBy: null,
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByDate: async function (date: string) {
        return mockExchangeRates.filter(function (r) {
          return r.effectiveDate === date
        })
      },
    }
    service = new GetRatesByDateService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all exchange rates for a given date', async function () {
      const result = await service.execute({ effectiveDate })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(r => r.effectiveDate === effectiveDate)).toBe(true)
      }
    })

    it('should return empty array when no rates exist for date', async function () {
      const result = await service.execute({ effectiveDate: '2023-01-01' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
