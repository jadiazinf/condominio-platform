import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  PaymentConceptsRepository,
  CurrenciesRepository,
  CondominiumsRepository,
  BuildingsRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  PaymentConceptFactory,
  CurrencyFactory,
  CondominiumFactory,
  BuildingFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('PaymentConceptsRepository', () => {
  let db: TTestDrizzleClient
  let repository: PaymentConceptsRepository
  let condominiumId: string
  let buildingId: string
  let currencyId: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new PaymentConceptsRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)

    const currenciesRepository = new CurrenciesRepository(db)
    const condominiumsRepository = new CondominiumsRepository(db)
    const buildingsRepository = new BuildingsRepository(db)

    const currency = await currenciesRepository.create(CurrencyFactory.usd())
    const condominium = await condominiumsRepository.create(
      CondominiumFactory.create({ defaultCurrencyId: currency.id })
    )
    const building = await buildingsRepository.create(BuildingFactory.create(condominium.id))

    condominiumId = condominium.id
    buildingId = building.id
    currencyId = currency.id
  })

  describe('create', () => {
    it('should create maintenance concept', async () => {
      const data = PaymentConceptFactory.maintenance({
        condominiumId,
        currencyId,
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.conceptType).toBe('maintenance')
      expect(result.isRecurring).toBe(true)
      expect(result.recurrencePeriod).toBe('monthly')
    })

    it('should create extraordinary concept', async () => {
      const data = PaymentConceptFactory.extraordinary({
        condominiumId,
        currencyId,
      })

      const result = await repository.create(data)

      expect(result.conceptType).toBe('extraordinary')
      expect(result.isRecurring).toBe(false)
    })

    it('should create concept for specific building', async () => {
      const data = PaymentConceptFactory.maintenance({
        buildingId,
        currencyId,
      })

      const result = await repository.create(data)

      expect(result.buildingId).toBe(buildingId)
    })
  })

  describe('getById', () => {
    it('should return concept by id', async () => {
      const created = await repository.create(
        PaymentConceptFactory.maintenance({ condominiumId, currencyId })
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
    it('should return active concepts only by default', async () => {
      await repository.create(
        PaymentConceptFactory.maintenance({ condominiumId, currencyId, isActive: true })
      )
      await repository.create(
        PaymentConceptFactory.fine({ condominiumId, currencyId, isActive: false })
      )

      const result = await repository.listAll()

      expect(result).toHaveLength(1)
      expect(result[0]?.isActive).toBe(true)
    })
  })

  describe('delete (soft delete)', () => {
    it('should soft delete concept', async () => {
      const created = await repository.create(
        PaymentConceptFactory.maintenance({ condominiumId, currencyId })
      )

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found?.isActive).toBe(false)
    })
  })

  describe('getByCondominiumId', () => {
    it('should return concepts for condominium', async () => {
      await repository.create(PaymentConceptFactory.maintenance({ condominiumId, currencyId }))
      await repository.create(PaymentConceptFactory.fine({ condominiumId, currencyId }))

      const result = await repository.getByCondominiumId(condominiumId)

      expect(result).toHaveLength(2)
      expect(result.every(c => c.condominiumId === condominiumId)).toBe(true)
    })
  })

  describe('getByBuildingId', () => {
    it('should return concepts for building', async () => {
      await repository.create(PaymentConceptFactory.maintenance({ buildingId, currencyId }))

      const result = await repository.getByBuildingId(buildingId)

      expect(result).toHaveLength(1)
      expect(result[0]?.buildingId).toBe(buildingId)
    })
  })

  describe('getByConceptType', () => {
    it('should return concepts by type', async () => {
      await repository.create(PaymentConceptFactory.maintenance({ condominiumId, currencyId }))
      await repository.create(PaymentConceptFactory.fine({ condominiumId, currencyId }))
      await repository.create(PaymentConceptFactory.maintenance({ buildingId, currencyId }))

      const result = await repository.getByConceptType('maintenance')

      expect(result).toHaveLength(2)
      expect(result.every(c => c.conceptType === 'maintenance')).toBe(true)
    })
  })

  describe('getRecurringConcepts', () => {
    it('should return only recurring concepts', async () => {
      await repository.create(PaymentConceptFactory.maintenance({ condominiumId, currencyId }))
      await repository.create(PaymentConceptFactory.extraordinary({ condominiumId, currencyId }))

      const result = await repository.getRecurringConcepts(true)

      expect(result).toHaveLength(1)
      expect(result[0]?.isRecurring).toBe(true)
    })
  })
})
