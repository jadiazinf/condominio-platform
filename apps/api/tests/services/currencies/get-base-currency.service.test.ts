import { describe, it, expect, beforeEach } from 'bun:test'
import type { TCurrency } from '@packages/domain'
import { GetBaseCurrencyService } from '@src/services/currencies'

type TMockRepository = {
  getBaseCurrency: () => Promise<TCurrency | null>
}

describe('GetBaseCurrencyService', function () {
  let service: GetBaseCurrencyService
  let mockRepository: TMockRepository

  const mockCurrency: TCurrency = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    isBaseCurrency: true,
    isActive: true,
    decimals: 2,
    registeredBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(function () {
    mockRepository = {
      getBaseCurrency: async function () {
        return mockCurrency
      },
    }
    service = new GetBaseCurrencyService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return base currency when configured', async function () {
      const result = await service.execute()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isBaseCurrency).toBe(true)
        expect(result.data.code).toBe('USD')
        expect(result.data.id).toBe(mockCurrency.id)
      }
    })

    it('should return NOT_FOUND error when no base currency configured', async function () {
      mockRepository = {
        getBaseCurrency: async function () {
          return null
        },
      }
      service = new GetBaseCurrencyService(mockRepository as never)

      const result = await service.execute()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('No base currency configured')
      }
    })
  })
})
