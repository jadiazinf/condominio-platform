import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  UnitOwnershipsRepository,
  UsersRepository,
  CurrenciesRepository,
  CondominiumsRepository,
  BuildingsRepository,
  UnitsRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  UnitOwnershipFactory,
  UserFactory,
  CurrencyFactory,
  CondominiumFactory,
  BuildingFactory,
  UnitFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('UnitOwnershipsRepository', () => {
  let db: TTestDrizzleClient
  let repository: UnitOwnershipsRepository
  let usersRepository: UsersRepository
  let unitsRepository: UnitsRepository
  let userId: string
  let userId2: string
  let unitId: string
  let unitId2: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new UnitOwnershipsRepository(db)
    usersRepository = new UsersRepository(db)
    const currenciesRepository = new CurrenciesRepository(db)
    const condominiumsRepository = new CondominiumsRepository(db)
    const buildingsRepository = new BuildingsRepository(db)
    unitsRepository = new UnitsRepository(db)

    // Store repos for setup
    ;(repository as any)._currenciesRepo = currenciesRepository
    ;(repository as any)._condominiumsRepo = condominiumsRepository
    ;(repository as any)._buildingsRepo = buildingsRepository
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)

    // Create dependencies
    const currenciesRepository = new CurrenciesRepository(db)
    const condominiumsRepository = new CondominiumsRepository(db)
    const buildingsRepository = new BuildingsRepository(db)

    const user1 = await usersRepository.create(UserFactory.create())
    const user2 = await usersRepository.create(UserFactory.create())
    const currency = await currenciesRepository.create(CurrencyFactory.usd())
    const condominium = await condominiumsRepository.create(
      CondominiumFactory.create({ defaultCurrencyId: currency.id })
    )
    const building = await buildingsRepository.create(
      BuildingFactory.create(condominium.id)
    )
    const unit1 = await unitsRepository.create(UnitFactory.create(building.id))
    const unit2 = await unitsRepository.create(UnitFactory.create(building.id))

    userId = user1.id
    userId2 = user2.id
    unitId = unit1.id
    unitId2 = unit2.id
  })

  describe('create', () => {
    it('should create owner ownership', async () => {
      const data = UnitOwnershipFactory.owner(unitId, userId)

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.unitId).toBe(unitId)
      expect(result.userId).toBe(userId)
      expect(result.ownershipType).toBe('owner')
      expect(result.ownershipPercentage).toBe('100.00')
      expect(result.isActive).toBe(true)
    })

    it('should create co-owner ownership', async () => {
      const data = UnitOwnershipFactory.coOwner(unitId, userId, { ownershipPercentage: '50.00' })

      const result = await repository.create(data)

      expect(result.ownershipType).toBe('co-owner')
      expect(result.ownershipPercentage).toBe('50.00')
    })

    it('should create tenant ownership', async () => {
      const data = UnitOwnershipFactory.tenant(unitId, userId)

      const result = await repository.create(data)

      expect(result.ownershipType).toBe('tenant')
      expect(result.endDate).toBeDefined()
    })
  })

  describe('getById', () => {
    it('should return ownership by id', async () => {
      const created = await repository.create(UnitOwnershipFactory.owner(unitId, userId))

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
    it('should return active ownerships only by default', async () => {
      await repository.create(UnitOwnershipFactory.owner(unitId, userId, { isActive: true }))
      await repository.create(UnitOwnershipFactory.owner(unitId2, userId2, { isActive: false }))

      const result = await repository.listAll()

      expect(result).toHaveLength(1)
      expect(result[0]?.isActive).toBe(true)
    })

    it('should return all ownerships when includeInactive is true', async () => {
      await repository.create(UnitOwnershipFactory.owner(unitId, userId, { isActive: true }))
      await repository.create(UnitOwnershipFactory.owner(unitId2, userId2, { isActive: false }))

      const result = await repository.listAll(true)

      expect(result).toHaveLength(2)
    })
  })

  describe('delete (soft delete)', () => {
    it('should soft delete ownership', async () => {
      const created = await repository.create(UnitOwnershipFactory.owner(unitId, userId))

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found?.isActive).toBe(false)
    })
  })

  describe('getByUnitId', () => {
    it('should return active ownerships for unit', async () => {
      await repository.create(UnitOwnershipFactory.owner(unitId, userId, { isActive: true }))
      await repository.create(UnitOwnershipFactory.coOwner(unitId, userId2, { isActive: false }))

      const result = await repository.getByUnitId(unitId)

      expect(result).toHaveLength(1)
      expect(result[0]?.userId).toBe(userId)
    })

    it('should return all ownerships including inactive when specified', async () => {
      await repository.create(UnitOwnershipFactory.owner(unitId, userId, { isActive: true }))
      await repository.create(UnitOwnershipFactory.coOwner(unitId, userId2, { isActive: false }))

      const result = await repository.getByUnitId(unitId, true)

      expect(result).toHaveLength(2)
    })
  })

  describe('getByUserId', () => {
    it('should return ownerships for user', async () => {
      await repository.create(UnitOwnershipFactory.owner(unitId, userId))
      await repository.create(UnitOwnershipFactory.owner(unitId2, userId))

      const result = await repository.getByUserId(userId)

      expect(result).toHaveLength(2)
      expect(result.every((o) => o.userId === userId)).toBe(true)
    })
  })

  describe('getByUnitAndUser', () => {
    it('should return ownership for specific unit and user', async () => {
      await repository.create(UnitOwnershipFactory.owner(unitId, userId))
      await repository.create(UnitOwnershipFactory.owner(unitId2, userId2))

      const result = await repository.getByUnitAndUser(unitId, userId)

      expect(result).toBeDefined()
      expect(result?.unitId).toBe(unitId)
      expect(result?.userId).toBe(userId)
    })

    it('should return null when no matching ownership', async () => {
      const result = await repository.getByUnitAndUser(unitId, userId)
      expect(result).toBeNull()
    })
  })

  describe('getPrimaryResidenceByUser', () => {
    it('should return primary residence for user', async () => {
      await repository.create(
        UnitOwnershipFactory.owner(unitId, userId, { isPrimaryResidence: false })
      )
      await repository.create(
        UnitOwnershipFactory.owner(unitId2, userId, { isPrimaryResidence: true })
      )

      const result = await repository.getPrimaryResidenceByUser(userId)

      expect(result).toBeDefined()
      expect(result?.unitId).toBe(unitId2)
      expect(result?.isPrimaryResidence).toBe(true)
    })

    it('should return null when no primary residence', async () => {
      await repository.create(
        UnitOwnershipFactory.owner(unitId, userId, { isPrimaryResidence: false })
      )

      const result = await repository.getPrimaryResidenceByUser(userId)

      expect(result).toBeNull()
    })

    it('should not return inactive primary residence', async () => {
      await repository.create(
        UnitOwnershipFactory.owner(unitId, userId, {
          isPrimaryResidence: true,
          isActive: false,
        })
      )

      const result = await repository.getPrimaryResidenceByUser(userId)

      expect(result).toBeNull()
    })
  })
})
