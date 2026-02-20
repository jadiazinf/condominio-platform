import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  CondominiumAccessCodesRepository,
  UsersRepository,
  CurrenciesRepository,
  CondominiumsRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  UserFactory,
  CurrencyFactory,
  CondominiumFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('CondominiumAccessCodesRepository', () => {
  let db: TTestDrizzleClient
  let repository: CondominiumAccessCodesRepository
  let condominiumId: string
  let condominiumId2: string
  let userId: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new CondominiumAccessCodesRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)

    const usersRepo = new UsersRepository(db)
    const currenciesRepo = new CurrenciesRepository(db)
    const condominiumsRepo = new CondominiumsRepository(db)

    const user = await usersRepo.create(UserFactory.create())
    const currency = await currenciesRepo.create(CurrencyFactory.usd())
    const condo1 = await condominiumsRepo.create(CondominiumFactory.create({ defaultCurrencyId: currency.id }))
    const condo2 = await condominiumsRepo.create(CondominiumFactory.create({ defaultCurrencyId: currency.id }))

    userId = user.id
    condominiumId = condo1.id
    condominiumId2 = condo2.id
  })

  describe('create', () => {
    it('should create an access code', async () => {
      const result = await repository.create({
        condominiumId,
        code: 'ABC123',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        createdBy: userId,
      })

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.condominiumId).toBe(condominiumId)
      expect(result.code).toBe('ABC123')
      expect(result.isActive).toBe(true)
      expect(result.createdBy).toBe(userId)
    })
  })

  describe('getById', () => {
    it('should return code by id', async () => {
      const created = await repository.create({
        condominiumId,
        code: 'XYZ789',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        createdBy: userId,
      })

      const result = await repository.getById(created.id)
      expect(result).toBeDefined()
      expect(result?.id).toBe(created.id)
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')
      expect(result).toBeNull()
    })
  })

  describe('getActiveByCondominiumId', () => {
    it('should return active non-expired code', async () => {
      await repository.create({
        condominiumId,
        code: 'ACTIVE1',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        createdBy: userId,
      })

      const result = await repository.getActiveByCondominiumId(condominiumId)
      expect(result).toBeDefined()
      expect(result?.code).toBe('ACTIVE1')
      expect(result?.isActive).toBe(true)
    })

    it('should not return inactive code', async () => {
      await repository.create({
        condominiumId,
        code: 'INACT1',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: false,
        createdBy: userId,
      })

      const result = await repository.getActiveByCondominiumId(condominiumId)
      expect(result).toBeNull()
    })

    it('should not return expired code', async () => {
      await repository.create({
        condominiumId,
        code: 'EXPRD1',
        expiresAt: new Date(Date.now() - 86400000),
        isActive: true,
        createdBy: userId,
      })

      const result = await repository.getActiveByCondominiumId(condominiumId)
      expect(result).toBeNull()
    })

    it('should not return codes from other condominiums', async () => {
      await repository.create({
        condominiumId: condominiumId2,
        code: 'OTHER1',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        createdBy: userId,
      })

      const result = await repository.getActiveByCondominiumId(condominiumId)
      expect(result).toBeNull()
    })
  })

  describe('getByCode', () => {
    it('should return code by code string', async () => {
      await repository.create({
        condominiumId,
        code: 'FIND01',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        createdBy: userId,
      })

      const result = await repository.getByCode('FIND01')
      expect(result).toBeDefined()
      expect(result?.code).toBe('FIND01')
    })

    it('should return null for non-existent code', async () => {
      const result = await repository.getByCode('NOEXIST')
      expect(result).toBeNull()
    })
  })

  describe('deactivateAllForCondominium', () => {
    it('should deactivate all codes for a condominium', async () => {
      await repository.create({
        condominiumId,
        code: 'CODE01',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        createdBy: userId,
      })
      await repository.create({
        condominiumId,
        code: 'CODE02',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        createdBy: userId,
      })

      await repository.deactivateAllForCondominium(condominiumId)

      const active = await repository.getActiveByCondominiumId(condominiumId)
      expect(active).toBeNull()
    })

    it('should not affect codes from other condominiums', async () => {
      await repository.create({
        condominiumId,
        code: 'MINE01',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        createdBy: userId,
      })
      await repository.create({
        condominiumId: condominiumId2,
        code: 'OTHER2',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        createdBy: userId,
      })

      await repository.deactivateAllForCondominium(condominiumId)

      const otherActive = await repository.getActiveByCondominiumId(condominiumId2)
      expect(otherActive).toBeDefined()
      expect(otherActive?.code).toBe('OTHER2')
    })
  })
})
