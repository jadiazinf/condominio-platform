import { describe, it, expect, beforeEach } from 'bun:test'
import type { TCurrency } from '@packages/domain'
import { GetCurrencyByCodeService } from '@src/services/currencies'

type TMockRepository = {
  getByCode: (code: string) => Promise<TCurrency | null>
}

describe('GetCurrencyByCodeService', function () {
  let service: GetCurrencyByCodeService
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
      getByCode: async function (code: string) {
        if (code === 'USD') {
          return mockCurrency
        }
        return null
      },
    }
    service = new GetCurrencyByCodeService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return currency when found', async function () {
      const result = await service.execute({ code: 'USD' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.code).toBe('USD')
        expect(result.data.id).toBe(mockCurrency.id)
      }
    })

    it('should return NOT_FOUND error when currency does not exist', async function () {
      const result = await service.execute({ code: 'XYZ' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Currency not found')
      }
    })
  })
})
