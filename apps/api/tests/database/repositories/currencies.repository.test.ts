import { describe, it, expect, beforeAll, beforeEach , afterAll} from 'bun:test'
import { CurrenciesRepository } from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  CurrencyFactory,
  type TTestDrizzleClient,
 stopTestContainer} from '@tests/setup'

describe('CurrenciesRepository', () => {
  let db: TTestDrizzleClient
  let repository: CurrenciesRepository

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new CurrenciesRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('create', () => {
    it('should create a new currency', async () => {
      const data = CurrencyFactory.create({
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.code).toBe('USD')
      expect(result.name).toBe('US Dollar')
      expect(result.symbol).toBe('$')
      expect(result.isActive).toBe(true)
      expect(result.decimals).toBe(2)
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.updatedAt).toBeInstanceOf(Date)
    })

    it('should create a base currency', async () => {
      const data = CurrencyFactory.create({
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        isBaseCurrency: true,
      })

      const result = await repository.create(data)

      expect(result.isBaseCurrency).toBe(true)
    })

    it('should throw error on duplicate code', async () => {
      const data = CurrencyFactory.create({ code: 'GBP' })

      await repository.create(data)

      await expect(repository.create(data)).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('should return currency by id', async () => {
      const data = CurrencyFactory.create({ code: 'JPY' })
      const created = await repository.create(data)

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.id).toBe(created.id)
      expect(result?.code).toBe('JPY')
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')

      expect(result).toBeNull()
    })
  })

  describe('listAll', () => {
    it('should return all active currencies', async () => {
      await repository.create(CurrencyFactory.create({ code: 'USD' }))
      await repository.create(CurrencyFactory.create({ code: 'EUR' }))
      await repository.create(CurrencyFactory.create({ code: 'GBP', isActive: false }))

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
      expect(result.every(c => c.isActive)).toBe(true)
    })

    it('should return all currencies including inactive when specified', async () => {
      await repository.create(CurrencyFactory.create({ code: 'USD' }))
      await repository.create(CurrencyFactory.create({ code: 'EUR', isActive: false }))

      const result = await repository.listAll(true)

      expect(result).toHaveLength(2)
    })

    it('should return empty array when no currencies exist', async () => {
      const result = await repository.listAll()

      expect(result).toEqual([])
    })
  })

  describe('update', () => {
    it('should update currency fields', async () => {
      const created = await repository.create(
        CurrencyFactory.create({ code: 'USD', name: 'US Dollar' })
      )

      const result = await repository.update(created.id, {
        name: 'United States Dollar',
        symbol: 'US$',
      })

      expect(result).toBeDefined()
      expect(result?.name).toBe('United States Dollar')
      expect(result?.symbol).toBe('US$')
      expect(result?.code).toBe('USD') // unchanged
    })

    it('should update updatedAt timestamp', async () => {
      const created = await repository.create(CurrencyFactory.create({ code: 'CAD' }))
      const originalUpdatedAt = created.updatedAt

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const result = await repository.update(created.id, { name: 'Canadian Dollar' })

      expect(result?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.update('00000000-0000-0000-0000-000000000000', {
        name: 'Test',
      })

      expect(result).toBeNull()
    })

    it('should return current entity when no updates provided', async () => {
      const created = await repository.create(CurrencyFactory.create({ code: 'CHF' }))

      const result = await repository.update(created.id, {})

      expect(result).toBeDefined()
      expect(result?.id).toBe(created.id)
    })
  })

  describe('delete (soft delete)', () => {
    it('should soft delete by setting isActive to false', async () => {
      const created = await repository.create(CurrencyFactory.create({ code: 'MXN' }))

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found?.isActive).toBe(false)
    })

    it('should return false for non-existent id', async () => {
      const result = await repository.delete('00000000-0000-0000-0000-000000000000')

      expect(result).toBe(false)
    })

    it('should exclude soft-deleted currencies from listAll', async () => {
      const created = await repository.create(CurrencyFactory.create({ code: 'ARS' }))
      await repository.delete(created.id)

      const result = await repository.listAll()

      expect(result).toHaveLength(0)
    })
  })

  describe('getByCode', () => {
    it('should return currency by code', async () => {
      await repository.create(CurrencyFactory.create({ code: 'BRL', name: 'Brazilian Real' }))

      const result = await repository.getByCode('BRL')

      expect(result).toBeDefined()
      expect(result?.code).toBe('BRL')
      expect(result?.name).toBe('Brazilian Real')
    })

    it('should return null for non-existent code', async () => {
      const result = await repository.getByCode('XXX')

      expect(result).toBeNull()
    })
  })

  describe('getBaseCurrency', () => {
    it('should return base currency', async () => {
      await repository.create(CurrencyFactory.create({ code: 'USD', isBaseCurrency: false }))
      await repository.create(CurrencyFactory.create({ code: 'VES', isBaseCurrency: true }))

      const result = await repository.getBaseCurrency()

      expect(result).toBeDefined()
      expect(result?.code).toBe('VES')
      expect(result?.isBaseCurrency).toBe(true)
    })

    it('should return null when no base currency exists', async () => {
      await repository.create(CurrencyFactory.create({ code: 'USD', isBaseCurrency: false }))

      const result = await repository.getBaseCurrency()

      expect(result).toBeNull()
    })
  })
})
