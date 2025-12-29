import { describe, it, expect, beforeEach } from 'bun:test'
import type { TExchangeRate } from '@packages/domain'
import { GetLatestRateService } from '@src/services/exchange-rates'

type TMockRepository = {
  getLatestRate: (fromCurrencyId: string, toCurrencyId: string) => Promise<TExchangeRate | null>
}

describe('GetLatestRateService', function () {
  let service: GetLatestRateService
  let mockRepository: TMockRepository

  const fromCurrencyId = '550e8400-e29b-41d4-a716-446655440001'
  const toCurrencyId = '550e8400-e29b-41d4-a716-446655440002'

  const mockExchangeRate: TExchangeRate = {
    id: '550e8400-e29b-41d4-a716-446655440010',
    fromCurrencyId,
    toCurrencyId,
    rate: '36.50',
    effectiveDate: '2024-01-15',
    source: 'BCV',
    createdAt: new Date(),
    createdBy: null,
    registeredBy: null,
  }

  beforeEach(function () {
    mockRepository = {
      getLatestRate: async function (from: string, to: string) {
        if (from === fromCurrencyId && to === toCurrencyId) {
          return mockExchangeRate
        }
        return null
      },
    }
    service = new GetLatestRateService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return exchange rate when found', async function () {
      const result = await service.execute({ fromCurrencyId, toCurrencyId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(mockExchangeRate.id)
        expect(result.data.rate).toBe('36.50')
        expect(result.data.fromCurrencyId).toBe(fromCurrencyId)
        expect(result.data.toCurrencyId).toBe(toCurrencyId)
      }
    })

    it('should return NOT_FOUND error when exchange rate does not exist', async function () {
      const result = await service.execute({
        fromCurrencyId: '550e8400-e29b-41d4-a716-446655440099',
        toCurrencyId: '550e8400-e29b-41d4-a716-446655440098',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Exchange rate not found')
      }
    })
  })
})
