import { describe, it, expect, beforeEach } from 'bun:test'
import { ConvertPaymentCurrencyService } from '@src/services/billing-payments/convert-payment-currency.service'

const vesCurrencyId = 'currency-ves'
const usdCurrencyId = 'currency-usd'

describe('ConvertPaymentCurrencyService', () => {
  let service: ConvertPaymentCurrencyService

  describe('with rate available', () => {
    beforeEach(() => {
      const mockExchangeRatesRepo = {
        getLatestRate: async () => ({
          id: 'rate-1', rate: '471.70', fromCurrencyId: vesCurrencyId, toCurrencyId: usdCurrencyId,
        }),
      }
      service = new ConvertPaymentCurrencyService(mockExchangeRatesRepo as never)
    })

    it('should convert VES to USD using BCV rate', async () => {
      const result = await service.execute({
        paymentAmount: '21226.50',
        paymentCurrencyId: vesCurrencyId,
        channelCurrencyId: usdCurrencyId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // 21226.50 / 471.70 ≈ 45.00
        expect(parseFloat(result.data.convertedAmount)).toBeCloseTo(45, 0)
        expect(result.data.exchangeRateId).toBe('rate-1')
        expect(result.data.isStaleRate).toBe(false)
      }
    })
  })

  describe('same currency (no conversion needed)', () => {
    beforeEach(() => {
      service = new ConvertPaymentCurrencyService({} as never)
    })

    it('should return same amount with no conversion', async () => {
      const result = await service.execute({
        paymentAmount: '45.00',
        paymentCurrencyId: usdCurrencyId,
        channelCurrencyId: usdCurrencyId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.convertedAmount).toBe('45.00')
        expect(result.data.exchangeRateId).toBeNull()
        expect(result.data.isStaleRate).toBe(false)
      }
    })
  })

  describe('stale rate fallback', () => {
    beforeEach(() => {
      let callCount = 0
      const mockRepo = {
        getLatestRate: async () => {
          callCount++
          if (callCount === 1) return null // today's rate missing
          return { id: 'rate-old', rate: '450.00' } // fallback
        },
      }
      service = new ConvertPaymentCurrencyService(mockRepo as never)
    })

    it('should use stale rate with flag when today rate unavailable', async () => {
      const result = await service.execute({
        paymentAmount: '22500.00',
        paymentCurrencyId: vesCurrencyId,
        channelCurrencyId: usdCurrencyId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // 22500 / 450 = 50
        expect(parseFloat(result.data.convertedAmount)).toBeCloseTo(50, 0)
        expect(result.data.isStaleRate).toBe(true)
      }
    })
  })

  describe('no rate available at all', () => {
    beforeEach(() => {
      service = new ConvertPaymentCurrencyService({
        getLatestRate: async () => null,
      } as never)
    })

    it('should fail when no exchange rate exists', async () => {
      const result = await service.execute({
        paymentAmount: '21226.50',
        paymentCurrencyId: vesCurrencyId,
        channelCurrencyId: usdCurrencyId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
      }
    })
  })
})
