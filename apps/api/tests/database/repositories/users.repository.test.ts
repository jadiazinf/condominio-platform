import { describe, it, expect, beforeAll, beforeEach , afterAll} from 'bun:test'
import { UsersRepository, CurrenciesRepository, LocationsRepository } from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  UserFactory,
  CurrencyFactory,
  LocationFactory,
  type TTestDrizzleClient,
 stopTestContainer} from '@tests/setup'

describe('UsersRepository', () => {
  let db: TTestDrizzleClient
  let repository: UsersRepository
  let currenciesRepository: CurrenciesRepository
  let locationsRepository: LocationsRepository

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new UsersRepository(db)
    currenciesRepository = new CurrenciesRepository(db)
    locationsRepository = new LocationsRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('create', () => {
    it('should create a new user', async () => {
      const data = UserFactory.create({
        email: 'test@example.com',
        firebaseUid: 'firebase123',
        firstName: 'John',
        lastName: 'Doe',
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.email).toBe('test@example.com')
      expect(result.firebaseUid).toBe('firebase123')
      expect(result.firstName).toBe('John')
      expect(result.lastName).toBe('Doe')
      expect(result.isActive).toBe(true)
    })

    it('should create user with location reference', async () => {
      const location = await locationsRepository.create(LocationFactory.create({ name: 'Caracas' }))

      const data = UserFactory.create({
        email: 'located@example.com',
        locationId: location.id,
      })

      const result = await repository.create(data)

      expect(result.locationId).toBe(location.id)
    })

    it('should create user with preferred currency', async () => {
      const currency = await currenciesRepository.create(CurrencyFactory.create({ code: 'USD' }))

      const data = UserFactory.create({
        email: 'currency@example.com',
        preferredCurrencyId: currency.id,
      })

      const result = await repository.create(data)

      expect(result.preferredCurrencyId).toBe(currency.id)
    })

    it('should throw error on duplicate email', async () => {
      await repository.create(UserFactory.create({ email: 'duplicate@example.com' }))

      await expect(
        repository.create(UserFactory.create({ email: 'duplicate@example.com' }))
      ).rejects.toThrow()
    })

    it('should throw error on duplicate firebase uid', async () => {
      await repository.create(UserFactory.create({ firebaseUid: 'duplicate123' }))

      await expect(
        repository.create(UserFactory.create({ firebaseUid: 'duplicate123' }))
      ).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('should return user by id', async () => {
      const created = await repository.create(UserFactory.create({ email: 'findme@example.com' }))

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.email).toBe('findme@example.com')
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')

      expect(result).toBeNull()
    })
  })

  describe('listAll', () => {
    it('should return all active users', async () => {
      await repository.create(UserFactory.create({ email: 'user1@example.com' }))
      await repository.create(UserFactory.create({ email: 'user2@example.com' }))
      await repository.create(
        UserFactory.create({ email: 'inactive@example.com', isActive: false })
      )

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
    })

    it('should include inactive when specified', async () => {
      await repository.create(UserFactory.create({ email: 'active@example.com' }))
      await repository.create(
        UserFactory.create({ email: 'inactive@example.com', isActive: false })
      )

      const result = await repository.listAll(true)

      expect(result).toHaveLength(2)
    })
  })

  describe('update', () => {
    it('should update user fields', async () => {
      const created = await repository.create(
        UserFactory.create({ email: 'update@example.com', firstName: 'Old' })
      )

      const result = await repository.update(created.id, {
        firstName: 'New',
        lastName: 'Name',
      })

      expect(result?.firstName).toBe('New')
      expect(result?.lastName).toBe('Name')
    })

    it('should update last login', async () => {
      const created = await repository.create(UserFactory.create())
      const loginTime = new Date()

      const result = await repository.update(created.id, {
        lastLogin: loginTime,
      })

      expect(result?.lastLogin).toEqual(loginTime)
    })
  })

  describe('delete (soft delete)', () => {
    it('should soft delete user', async () => {
      const created = await repository.create(UserFactory.create({ email: 'delete@example.com' }))

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found?.isActive).toBe(false)
    })
  })

  describe('getByEmail', () => {
    it('should return user by email', async () => {
      await repository.create(UserFactory.create({ email: 'search@example.com' }))

      const result = await repository.getByEmail('search@example.com')

      expect(result).toBeDefined()
      expect(result?.email).toBe('search@example.com')
    })

    it('should return null for non-existent email', async () => {
      const result = await repository.getByEmail('nonexistent@example.com')

      expect(result).toBeNull()
    })
  })

  describe('getByFirebaseUid', () => {
    it('should return user by firebase uid', async () => {
      await repository.create(
        UserFactory.create({ email: 'firebase@example.com', firebaseUid: 'uid123' })
      )

      const result = await repository.getByFirebaseUid('uid123')

      expect(result).toBeDefined()
      expect(result?.firebaseUid).toBe('uid123')
    })

    it('should return null for non-existent uid', async () => {
      const result = await repository.getByFirebaseUid('nonexistent')

      expect(result).toBeNull()
    })
  })
})
