import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  AccessRequestsRepository,
  CondominiumAccessCodesRepository,
  UsersRepository,
  CurrenciesRepository,
  CondominiumsRepository,
  BuildingsRepository,
  UnitsRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  UserFactory,
  CurrencyFactory,
  CondominiumFactory,
  BuildingFactory,
  UnitFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('AccessRequestsRepository', () => {
  let db: TTestDrizzleClient
  let repository: AccessRequestsRepository
  let condominiumId: string
  let unitId: string
  let unitId2: string
  let userId: string
  let userId2: string
  let accessCodeId: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new AccessRequestsRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)

    const usersRepo = new UsersRepository(db)
    const currenciesRepo = new CurrenciesRepository(db)
    const condominiumsRepo = new CondominiumsRepository(db)
    const buildingsRepo = new BuildingsRepository(db)
    const unitsRepo = new UnitsRepository(db)
    const accessCodesRepo = new CondominiumAccessCodesRepository(db)

    const user1 = await usersRepo.create(UserFactory.create())
    const user2 = await usersRepo.create(UserFactory.create())
    const currency = await currenciesRepo.create(CurrencyFactory.usd())
    const condominium = await condominiumsRepo.create(CondominiumFactory.create({ defaultCurrencyId: currency.id }))
    const building = await buildingsRepo.create(BuildingFactory.create(condominium.id))
    const unit1 = await unitsRepo.create(UnitFactory.create(building.id))
    const unit2 = await unitsRepo.create(UnitFactory.create(building.id))

    const accessCode = await accessCodesRepo.create({
      condominiumId: condominium.id,
      code: 'TEST01',
      expiresAt: new Date(Date.now() + 86400000),
      isActive: true,
      createdBy: user1.id,
    })

    userId = user1.id
    userId2 = user2.id
    condominiumId = condominium.id
    unitId = unit1.id
    unitId2 = unit2.id
    accessCodeId = accessCode.id
  })

  describe('create', () => {
    it('should create an access request', async () => {
      const result = await repository.create({
        condominiumId,
        unitId,
        userId,
        accessCodeId,
        ownershipType: 'tenant',
        status: 'pending',
        adminNotes: null,
        reviewedBy: null,
        reviewedAt: null,
      })

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.condominiumId).toBe(condominiumId)
      expect(result.unitId).toBe(unitId)
      expect(result.userId).toBe(userId)
      expect(result.status).toBe('pending')
      expect(result.ownershipType).toBe('tenant')
    })
  })

  describe('listByCondominium', () => {
    it('should return requests for a condominium', async () => {
      await repository.create({
        condominiumId,
        unitId,
        userId,
        accessCodeId,
        ownershipType: 'tenant',
        status: 'pending',
        adminNotes: null,
        reviewedBy: null,
        reviewedAt: null,
      })
      await repository.create({
        condominiumId,
        unitId: unitId2,
        userId: userId2,
        accessCodeId,
        ownershipType: 'owner',
        status: 'approved',
        adminNotes: null,
        reviewedBy: userId,
        reviewedAt: new Date(),
      })

      const result = await repository.listByCondominium(condominiumId)
      expect(result).toHaveLength(2)
    })

    it('should filter by status', async () => {
      await repository.create({
        condominiumId,
        unitId,
        userId,
        accessCodeId,
        ownershipType: 'tenant',
        status: 'pending',
        adminNotes: null,
        reviewedBy: null,
        reviewedAt: null,
      })
      await repository.create({
        condominiumId,
        unitId: unitId2,
        userId: userId2,
        accessCodeId,
        ownershipType: 'owner',
        status: 'approved',
        adminNotes: null,
        reviewedBy: userId,
        reviewedAt: new Date(),
      })

      const pendingOnly = await repository.listByCondominium(condominiumId, 'pending')
      expect(pendingOnly).toHaveLength(1)
      expect(pendingOnly[0]?.status).toBe('pending')
    })

    it('should return empty array when no requests exist', async () => {
      const result = await repository.listByCondominium(condominiumId)
      expect(result).toHaveLength(0)
    })
  })

  describe('listByUser', () => {
    it('should return requests for a user', async () => {
      await repository.create({
        condominiumId,
        unitId,
        userId,
        accessCodeId,
        ownershipType: 'tenant',
        status: 'pending',
        adminNotes: null,
        reviewedBy: null,
        reviewedAt: null,
      })

      const result = await repository.listByUser(userId)
      expect(result).toHaveLength(1)
    })

    it('should not return requests from other users', async () => {
      await repository.create({
        condominiumId,
        unitId,
        userId: userId2,
        accessCodeId,
        ownershipType: 'tenant',
        status: 'pending',
        adminNotes: null,
        reviewedBy: null,
        reviewedAt: null,
      })

      const result = await repository.listByUser(userId)
      expect(result).toHaveLength(0)
    })
  })

  describe('getPendingByUserAndUnit', () => {
    it('should return pending request for user and unit', async () => {
      await repository.create({
        condominiumId,
        unitId,
        userId,
        accessCodeId,
        ownershipType: 'tenant',
        status: 'pending',
        adminNotes: null,
        reviewedBy: null,
        reviewedAt: null,
      })

      const result = await repository.getPendingByUserAndUnit(userId, unitId)
      expect(result).toBeDefined()
      expect(result?.userId).toBe(userId)
      expect(result?.unitId).toBe(unitId)
      expect(result?.status).toBe('pending')
    })

    it('should return null when no pending request exists', async () => {
      const result = await repository.getPendingByUserAndUnit(userId, unitId)
      expect(result).toBeNull()
    })

    it('should not return non-pending requests', async () => {
      await repository.create({
        condominiumId,
        unitId,
        userId,
        accessCodeId,
        ownershipType: 'tenant',
        status: 'approved',
        adminNotes: null,
        reviewedBy: userId2,
        reviewedAt: new Date(),
      })

      const result = await repository.getPendingByUserAndUnit(userId, unitId)
      expect(result).toBeNull()
    })
  })

  describe('countPending', () => {
    it('should count pending requests', async () => {
      await repository.create({
        condominiumId,
        unitId,
        userId,
        accessCodeId,
        ownershipType: 'tenant',
        status: 'pending',
        adminNotes: null,
        reviewedBy: null,
        reviewedAt: null,
      })
      await repository.create({
        condominiumId,
        unitId: unitId2,
        userId: userId2,
        accessCodeId,
        ownershipType: 'owner',
        status: 'pending',
        adminNotes: null,
        reviewedBy: null,
        reviewedAt: null,
      })

      const count = await repository.countPending(condominiumId)
      expect(count).toBe(2)
    })

    it('should not count non-pending requests', async () => {
      await repository.create({
        condominiumId,
        unitId,
        userId,
        accessCodeId,
        ownershipType: 'tenant',
        status: 'approved',
        adminNotes: null,
        reviewedBy: userId2,
        reviewedAt: new Date(),
      })

      const count = await repository.countPending(condominiumId)
      expect(count).toBe(0)
    })

    it('should return 0 when no requests exist', async () => {
      const count = await repository.countPending(condominiumId)
      expect(count).toBe(0)
    })
  })
})
