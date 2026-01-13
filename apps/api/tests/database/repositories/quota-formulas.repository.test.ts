import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  QuotaFormulasRepository,
  CurrenciesRepository,
  CondominiumsRepository,
  UsersRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  QuotaFormulaFactory,
  CurrencyFactory,
  CondominiumFactory,
  UserFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('QuotaFormulasRepository', () => {
  let db: TTestDrizzleClient
  let repository: QuotaFormulasRepository
  let condominiumId: string
  let condominiumId2: string
  let currencyId: string
  let userId: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new QuotaFormulasRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)

    const usersRepository = new UsersRepository(db)
    const currenciesRepository = new CurrenciesRepository(db)
    const condominiumsRepository = new CondominiumsRepository(db)

    const user = await usersRepository.create(UserFactory.create())
    const currency = await currenciesRepository.create(CurrencyFactory.usd())
    const condominium1 = await condominiumsRepository.create(
      CondominiumFactory.create({ defaultCurrencyId: currency.id })
    )
    const condominium2 = await condominiumsRepository.create(
      CondominiumFactory.create({ defaultCurrencyId: currency.id })
    )

    userId = user.id
    condominiumId = condominium1.id
    condominiumId2 = condominium2.id
    currencyId = currency.id
  })

  describe('create', () => {
    it('should create fixed amount formula', async () => {
      const data = QuotaFormulaFactory.fixed('100.00', {
        condominiumId,
        currencyId,
        createdBy: userId,
        name: 'Fixed Formula',
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.condominiumId).toBe(condominiumId)
      expect(result.formulaType).toBe('fixed')
      expect(result.fixedAmount).toBe('100.00')
      expect(result.isActive).toBe(true)
    })

    it('should create expression formula', async () => {
      const data = QuotaFormulaFactory.expression('base_rate * aliquot_percentage / 100', {
        condominiumId,
        currencyId,
        createdBy: userId,
      })

      const result = await repository.create(data)

      expect(result.formulaType).toBe('expression')
      expect(result.expression).toBe('base_rate * aliquot_percentage / 100')
    })

    it('should create per-unit formula', async () => {
      const unitAmounts = { 'unit-1': '100.00', 'unit-2': '150.00' }
      const data = QuotaFormulaFactory.perUnit(unitAmounts, {
        condominiumId,
        currencyId,
        createdBy: userId,
      })

      const result = await repository.create(data)

      expect(result.formulaType).toBe('per_unit')
      expect(result.unitAmounts).toEqual(unitAmounts)
    })
  })

  describe('getById', () => {
    it('should return formula by id', async () => {
      const created = await repository.create(
        QuotaFormulaFactory.fixed('50.00', { condominiumId, currencyId, createdBy: userId })
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
    it('should return active formulas only by default', async () => {
      await repository.create(
        QuotaFormulaFactory.fixed('100.00', {
          condominiumId,
          currencyId,
          createdBy: userId,
          isActive: true,
        })
      )
      await repository.create(
        QuotaFormulaFactory.fixed('50.00', {
          condominiumId,
          currencyId,
          createdBy: userId,
          isActive: false,
        })
      )

      const result = await repository.listAll()

      expect(result).toHaveLength(1)
      expect(result[0]?.isActive).toBe(true)
    })
  })

  describe('delete (soft delete)', () => {
    it('should soft delete formula', async () => {
      const created = await repository.create(
        QuotaFormulaFactory.fixed('100.00', { condominiumId, currencyId, createdBy: userId })
      )

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found?.isActive).toBe(false)
    })
  })

  describe('getByCondominiumId', () => {
    it('should return formulas for condominium', async () => {
      await repository.create(
        QuotaFormulaFactory.fixed('100.00', { condominiumId, currencyId, createdBy: userId })
      )
      await repository.create(
        QuotaFormulaFactory.expression('base_rate', {
          condominiumId,
          currencyId,
          createdBy: userId,
        })
      )
      await repository.create(
        QuotaFormulaFactory.fixed('50.00', {
          condominiumId: condominiumId2,
          currencyId,
          createdBy: userId,
        })
      )

      const result = await repository.getByCondominiumId(condominiumId)

      expect(result).toHaveLength(2)
      expect(result.every(f => f.condominiumId === condominiumId)).toBe(true)
    })
  })

  // NOTE: Method getActiveByCondominiumId does not exist, use getByCondominiumId instead which filters by isActive
  describe('getActiveByCondominiumId', () => {
    it('should return only active formulas', async () => {
      await repository.create(
        QuotaFormulaFactory.fixed('100.00', {
          condominiumId,
          currencyId,
          createdBy: userId,
          isActive: true,
        })
      )
      await repository.create(
        QuotaFormulaFactory.fixed('50.00', {
          condominiumId,
          currencyId,
          createdBy: userId,
          isActive: false,
        })
      )

      const result = await repository.getByCondominiumId(condominiumId)

      expect(result).toHaveLength(1)
      expect(result[0]?.isActive).toBe(true)
    })
  })

  describe('getByFormulaType', () => {
    it('should return formulas by type', async () => {
      await repository.create(
        QuotaFormulaFactory.fixed('100.00', { condominiumId, currencyId, createdBy: userId })
      )
      await repository.create(
        QuotaFormulaFactory.expression('base_rate', {
          condominiumId,
          currencyId,
          createdBy: userId,
        })
      )
      await repository.create(
        QuotaFormulaFactory.fixed('50.00', {
          condominiumId: condominiumId2,
          currencyId,
          createdBy: userId,
        })
      )

      const result = await repository.getByFormulaType('fixed')

      expect(result).toHaveLength(2)
      expect(result.every(f => f.formulaType === 'fixed')).toBe(true)
    })
  })
})
