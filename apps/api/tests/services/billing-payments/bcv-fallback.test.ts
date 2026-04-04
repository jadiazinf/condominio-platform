import { describe, it, expect } from 'bun:test'
import { ConvertPaymentCurrencyService } from '@services/billing-payments/convert-payment-currency.service'

function createMockRepo(rates: Record<string, { id: string; rate: string } | null> = {}) {
  return {
    getLatestRate: async (from: string, to: string, date: string | null) => {
      const key = date ? `${from}-${to}-${date}` : `${from}-${to}-latest`
      return rates[key] ?? null
    },
  } as never
}

describe('ConvertPaymentCurrencyService — BCV Fallback', () => {
  // ─── Same currency (no conversion) ───

  it('returns original amount when currencies are the same', async () => {
    const service = new ConvertPaymentCurrencyService(createMockRepo())

    const result = await service.execute({
      paymentAmount: '100.00',
      paymentCurrencyId: 'usd',
      channelCurrencyId: 'usd',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.convertedAmount).toBe('100.00')
      expect(result.data.exchangeRateId).toBeNull()
      expect(result.data.isStaleRate).toBe(false)
    }
  })

  // ─── Normal conversion with today's rate ───

  it('converts using today BCV rate', async () => {
    const today = new Date().toISOString().split('T')[0]!
    const service = new ConvertPaymentCurrencyService(createMockRepo({
      [`ves-usd-${today}`]: { id: 'rate-1', rate: '80.00' },
    }))

    const result = await service.execute({
      paymentAmount: '8000.00',
      paymentCurrencyId: 'ves',
      channelCurrencyId: 'usd',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(parseFloat(result.data.convertedAmount)).toBeCloseTo(100, 1)
      expect(result.data.exchangeRateId).toBe('rate-1')
      expect(result.data.isStaleRate).toBe(false)
    }
  })

  // ─── Stale fallback ───

  it('falls back to latest known rate when today rate unavailable', async () => {
    const service = new ConvertPaymentCurrencyService(createMockRepo({
      // No today rate, but latest rate exists
      'ves-usd-latest': { id: 'rate-old', rate: '75.00' },
    }))

    const result = await service.execute({
      paymentAmount: '7500.00',
      paymentCurrencyId: 'ves',
      channelCurrencyId: 'usd',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(parseFloat(result.data.convertedAmount)).toBeCloseTo(100, 1)
      expect(result.data.exchangeRateId).toBe('rate-old')
      expect(result.data.isStaleRate).toBe(true) // flagged as stale
    }
  })

  // ─── No rate available ───

  it('fails when no rate available at all', async () => {
    const service = new ConvertPaymentCurrencyService(createMockRepo({}))

    const result = await service.execute({
      paymentAmount: '1000.00',
      paymentCurrencyId: 'ves',
      channelCurrencyId: 'usd',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe('BAD_REQUEST')
      expect(result.error).toContain('tasa de cambio')
    }
  })

  // ─── Custom date ───

  it('uses custom date for rate lookup', async () => {
    const service = new ConvertPaymentCurrencyService(createMockRepo({
      'ves-usd-2026-03-15': { id: 'rate-march', rate: '78.00' },
    }))

    const result = await service.execute({
      paymentAmount: '7800.00',
      paymentCurrencyId: 'ves',
      channelCurrencyId: 'usd',
      date: '2026-03-15',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(parseFloat(result.data.convertedAmount)).toBeCloseTo(100, 1)
      expect(result.data.exchangeRateId).toBe('rate-march')
      expect(result.data.isStaleRate).toBe(false)
    }
  })

  // ─── Edge: very small amounts ───

  it('handles small conversion amounts correctly', async () => {
    const today = new Date().toISOString().split('T')[0]!
    const service = new ConvertPaymentCurrencyService(createMockRepo({
      [`ves-usd-${today}`]: { id: 'rate-1', rate: '80.00' },
    }))

    const result = await service.execute({
      paymentAmount: '0.80',
      paymentCurrencyId: 'ves',
      channelCurrencyId: 'usd',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(parseFloat(result.data.convertedAmount)).toBeCloseTo(0.01, 2)
    }
  })

  // ─── Stale flag is critical for admin warning ───

  it('isStaleRate flag distinguishes fresh from fallback rates', async () => {
    const today = new Date().toISOString().split('T')[0]!

    // Fresh rate
    const freshService = new ConvertPaymentCurrencyService(createMockRepo({
      [`ves-usd-${today}`]: { id: 'fresh', rate: '80.00' },
    }))
    const freshResult = await freshService.execute({
      paymentAmount: '800.00', paymentCurrencyId: 'ves', channelCurrencyId: 'usd',
    })

    // Stale rate
    const staleService = new ConvertPaymentCurrencyService(createMockRepo({
      'ves-usd-latest': { id: 'stale', rate: '80.00' },
    }))
    const staleResult = await staleService.execute({
      paymentAmount: '800.00', paymentCurrencyId: 'ves', channelCurrencyId: 'usd',
    })

    expect(freshResult.success && freshResult.data.isStaleRate).toBe(false)
    expect(staleResult.success && staleResult.data.isStaleRate).toBe(true)
  })
})
