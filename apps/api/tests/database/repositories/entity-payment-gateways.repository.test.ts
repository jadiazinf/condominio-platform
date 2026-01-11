import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  EntityPaymentGatewaysRepository,
  PaymentGatewaysRepository,
  CurrenciesRepository,
  CondominiumsRepository,
  BuildingsRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  EntityPaymentGatewayFactory,
  PaymentGatewayFactory,
  CurrencyFactory,
  CondominiumFactory,
  BuildingFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('EntityPaymentGatewaysRepository', () => {
  let db: TTestDrizzleClient
  let repository: EntityPaymentGatewaysRepository
  let paymentGatewayId: string
  let paymentGatewayId2: string
  let condominiumId: string
  let buildingId: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new EntityPaymentGatewaysRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)

    const paymentGatewaysRepository = new PaymentGatewaysRepository(db)
    const currenciesRepository = new CurrenciesRepository(db)
    const condominiumsRepository = new CondominiumsRepository(db)
    const buildingsRepository = new BuildingsRepository(db)

    const currency = await currenciesRepository.create(CurrencyFactory.usd())
    const gateway1 = await paymentGatewaysRepository.create(
      PaymentGatewayFactory.create({ supportedCurrencies: [currency.id] })
    )
    const gateway2 = await paymentGatewaysRepository.create(
      PaymentGatewayFactory.create({ supportedCurrencies: [currency.id] })
    )
    const condominium = await condominiumsRepository.create(
      CondominiumFactory.create({ defaultCurrencyId: currency.id })
    )
    const building = await buildingsRepository.create(
      BuildingFactory.create(condominium.id)
    )

    paymentGatewayId = gateway1.id
    paymentGatewayId2 = gateway2.id
    condominiumId = condominium.id
    buildingId = building.id
  })

  describe('create', () => {
    it('should create entity payment gateway for condominium', async () => {
      const data = EntityPaymentGatewayFactory.forCondominium(paymentGatewayId, condominiumId)

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.paymentGatewayId).toBe(paymentGatewayId)
      expect(result.condominiumId).toBe(condominiumId)
      expect(result.buildingId).toBeNull()
      expect(result.isActive).toBe(true)
    })

    it('should create entity payment gateway for building', async () => {
      const data = EntityPaymentGatewayFactory.forBuilding(paymentGatewayId, buildingId)

      const result = await repository.create(data)

      expect(result.buildingId).toBe(buildingId)
    })
  })

  describe('getById', () => {
    it('should return entity gateway by id', async () => {
      const created = await repository.create(
        EntityPaymentGatewayFactory.forCondominium(paymentGatewayId, condominiumId)
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
    it('should return active entity gateways only by default', async () => {
      await repository.create(
        EntityPaymentGatewayFactory.forCondominium(paymentGatewayId, condominiumId, {
          isActive: true,
        })
      )
      await repository.create(
        EntityPaymentGatewayFactory.forBuilding(paymentGatewayId2, buildingId, { isActive: false })
      )

      const result = await repository.listAll()

      expect(result).toHaveLength(1)
      expect(result[0]?.isActive).toBe(true)
    })
  })

  describe('delete (soft delete)', () => {
    it('should soft delete entity gateway', async () => {
      const created = await repository.create(
        EntityPaymentGatewayFactory.forCondominium(paymentGatewayId, condominiumId)
      )

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found?.isActive).toBe(false)
    })
  })

  describe('getByCondominiumId', () => {
    it('should return gateways for condominium', async () => {
      await repository.create(
        EntityPaymentGatewayFactory.forCondominium(paymentGatewayId, condominiumId)
      )
      await repository.create(
        EntityPaymentGatewayFactory.forCondominium(paymentGatewayId2, condominiumId)
      )

      const result = await repository.getByCondominiumId(condominiumId)

      expect(result).toHaveLength(2)
      expect(result.every((g) => g.condominiumId === condominiumId)).toBe(true)
    })
  })

  describe('getByBuildingId', () => {
    it('should return gateways for building', async () => {
      await repository.create(EntityPaymentGatewayFactory.forBuilding(paymentGatewayId, buildingId))

      const result = await repository.getByBuildingId(buildingId)

      expect(result).toHaveLength(1)
      expect(result[0]?.buildingId).toBe(buildingId)
    })
  })

  describe('getByPaymentGatewayId', () => {
    it('should return all entities using gateway', async () => {
      await repository.create(
        EntityPaymentGatewayFactory.forCondominium(paymentGatewayId, condominiumId)
      )
      await repository.create(EntityPaymentGatewayFactory.forBuilding(paymentGatewayId, buildingId))

      const result = await repository.getByPaymentGatewayId(paymentGatewayId)

      expect(result).toHaveLength(2)
      expect(result.every((g) => g.paymentGatewayId === paymentGatewayId)).toBe(true)
    })
  })

})
