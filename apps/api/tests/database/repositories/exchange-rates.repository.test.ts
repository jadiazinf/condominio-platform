import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import { ExchangeRatesRepository, CurrenciesRepository } from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  ExchangeRateFactory,
  CurrencyFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('ExchangeRatesRepository', () => {
  let db: TTestDrizzleClient
  let repository: ExchangeRatesRepository
  let currenciesRepository: CurrenciesRepository
  let usdId: string
  let vesId: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new ExchangeRatesRepository(db)
    currenciesRepository = new CurrenciesRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)

    // Create test currencies
    const usd = await currenciesRepository.create(CurrencyFactory.usd())
    const ves = await currenciesRepository.create(
      CurrencyFactory.create({ code: 'VES', name: 'Bolivar', symbol: 'Bs' })
    )
    usdId = usd.id
    vesId = ves.id
  })

  describe('create', () => {
    it('should create a new exchange rate', async () => {
      const data = ExchangeRateFactory.create({
        fromCurrencyId: usdId,
        toCurrencyId: vesId,
        rate: '50.25',
        effectiveDate: '2025-01-15',
        source: 'BCV',
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.fromCurrencyId).toBe(usdId)
      expect(result.toCurrencyId).toBe(vesId)
      expect(parseFloat(result.rate)).toBe(50.25)
      expect(result.effectiveDate).toBe('2025-01-15')
      expect(result.source).toBe('BCV')
    })

    it('should create multiple rates for same currency pair', async () => {
      await repository.create(
        ExchangeRateFactory.create({
          fromCurrencyId: usdId,
          toCurrencyId: vesId,
          rate: '48.00',
          effectiveDate: '2025-01-10',
        })
      )

      await repository.create(
        ExchangeRateFactory.create({
          fromCurrencyId: usdId,
          toCurrencyId: vesId,
          rate: '50.00',
          effectiveDate: '2025-01-15',
        })
      )

      const all = await repository.listAll()
      expect(all).toHaveLength(2)
    })
  })

  describe('getById', () => {
    it('should return exchange rate by id', async () => {
      const created = await repository.create(
        ExchangeRateFactory.create({
          fromCurrencyId: usdId,
          toCurrencyId: vesId,
        })
      )

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.id).toBe(created.id)
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')
      expect(result).toBeNull()
    })
  })

  describe('listAll', () => {
    it('should return all exchange rates', async () => {
      await repository.create(
        ExchangeRateFactory.create({ fromCurrencyId: usdId, toCurrencyId: vesId })
      )
      await repository.create(
        ExchangeRateFactory.create({ fromCurrencyId: vesId, toCurrencyId: usdId })
      )

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
    })

    it('should return empty array when no rates exist', async () => {
      const result = await repository.listAll()
      expect(result).toEqual([])
    })
  })

  describe('update', () => {
    it('should update exchange rate fields', async () => {
      const created = await repository.create(
        ExchangeRateFactory.create({
          fromCurrencyId: usdId,
          toCurrencyId: vesId,
          rate: '50.00',
        })
      )

      const result = await repository.update(created.id, {
        rate: '52.00',
        source: 'Updated',
      })

      expect(result).toBeDefined()
      expect(parseFloat(result!.rate)).toBe(52)
      expect(result?.source).toBe('Updated')
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.update('00000000-0000-0000-0000-000000000000', {
        rate: '100.00',
      })
      expect(result).toBeNull()
    })
  })

  describe('delete (hard delete)', () => {
    it('should hard delete exchange rate', async () => {
      const created = await repository.create(
        ExchangeRateFactory.create({ fromCurrencyId: usdId, toCurrencyId: vesId })
      )

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found).toBeNull()
    })

    it('should return false for non-existent id', async () => {
      const result = await repository.delete('00000000-0000-0000-0000-000000000000')
      expect(result).toBe(false)
    })
  })

  describe('getLatestRate', () => {
    it('should return latest rate for currency pair', async () => {
      await repository.create(
        ExchangeRateFactory.create({
          fromCurrencyId: usdId,
          toCurrencyId: vesId,
          rate: '48.00',
          effectiveDate: '2025-01-10',
        })
      )

      await repository.create(
        ExchangeRateFactory.create({
          fromCurrencyId: usdId,
          toCurrencyId: vesId,
          rate: '50.00',
          effectiveDate: '2025-01-15',
        })
      )

      await repository.create(
        ExchangeRateFactory.create({
          fromCurrencyId: usdId,
          toCurrencyId: vesId,
          rate: '49.00',
          effectiveDate: '2025-01-12',
        })
      )

      const result = await repository.getLatestRate(usdId, vesId)

      expect(result).toBeDefined()
      expect(parseFloat(result!.rate)).toBe(50)
      expect(result?.effectiveDate).toBe('2025-01-15')
    })

    it('should return null when no rate exists', async () => {
      const result = await repository.getLatestRate(usdId, vesId)
      expect(result).toBeNull()
    })
  })

  describe('getByDate', () => {
    it('should return rates for specific date', async () => {
      await repository.create(
        ExchangeRateFactory.create({
          fromCurrencyId: usdId,
          toCurrencyId: vesId,
          effectiveDate: '2025-01-15',
        })
      )

      await repository.create(
        ExchangeRateFactory.create({
          fromCurrencyId: vesId,
          toCurrencyId: usdId,
          effectiveDate: '2025-01-15',
        })
      )

      await repository.create(
        ExchangeRateFactory.create({
          fromCurrencyId: usdId,
          toCurrencyId: vesId,
          effectiveDate: '2025-01-16',
        })
      )

      const result = await repository.getByDate('2025-01-15')

      expect(result).toHaveLength(2)
      expect(result.every((r) => r.effectiveDate === '2025-01-15')).toBe(true)
    })

    it('should return empty array when no rates for date', async () => {
      const result = await repository.getByDate('2025-12-31')
      expect(result).toEqual([])
    })
  })
})
