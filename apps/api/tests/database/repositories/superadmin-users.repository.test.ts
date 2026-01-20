import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import { SuperadminUsersRepository, UsersRepository } from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  SuperadminUserFactory,
  UserFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('SuperadminUsersRepository', () => {
  let db: TTestDrizzleClient
  let repository: SuperadminUsersRepository
  let usersRepository: UsersRepository
  let testUserId: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new SuperadminUsersRepository(db)
    usersRepository = new UsersRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)
    // Create a test user for superadmin
    const user = await usersRepository.create(
      UserFactory.create({ email: 'superadmin@test.com', firebaseUid: 'firebase-superadmin-1' })
    )
    testUserId = user.id
  })

  describe('create', () => {
    it('should create a new superadmin user', async () => {
      const data = SuperadminUserFactory.create({
        userId: testUserId,
        notes: 'Platform administrator',
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.userId).toBe(testUserId)
      expect(result.notes).toBe('Platform administrator')
      expect(result.isActive).toBe(true)
    })

    it('should create an inactive superadmin user', async () => {
      const data = SuperadminUserFactory.inactive({ userId: testUserId })

      const result = await repository.create(data)

      expect(result.isActive).toBe(false)
    })

    it('should throw error on duplicate userId', async () => {
      await repository.create(SuperadminUserFactory.create({ userId: testUserId }))

      await expect(
        repository.create(SuperadminUserFactory.create({ userId: testUserId }))
      ).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('should return superadmin user by id', async () => {
      const created = await repository.create(
        SuperadminUserFactory.create({ userId: testUserId, notes: 'Test superadmin' })
      )

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.notes).toBe('Test superadmin')
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')

      expect(result).toBeNull()
    })
  })

  describe('getByUserId', () => {
    it('should return superadmin user by userId', async () => {
      await repository.create(
        SuperadminUserFactory.create({ userId: testUserId, notes: 'Found by userId' })
      )

      const result = await repository.getByUserId(testUserId)

      expect(result).toBeDefined()
      expect(result?.userId).toBe(testUserId)
      expect(result?.notes).toBe('Found by userId')
    })

    it('should return null for non-existent userId', async () => {
      const result = await repository.getByUserId('00000000-0000-0000-0000-000000000000')

      expect(result).toBeNull()
    })
  })

  describe('isUserSuperadmin', () => {
    it('should return true for active superadmin', async () => {
      await repository.create(SuperadminUserFactory.active({ userId: testUserId }))

      const result = await repository.isUserSuperadmin(testUserId)

      expect(result).toBe(true)
    })

    it('should return false for inactive superadmin', async () => {
      await repository.create(SuperadminUserFactory.inactive({ userId: testUserId }))

      const result = await repository.isUserSuperadmin(testUserId)

      expect(result).toBe(false)
    })

    it('should return false for non-existent user', async () => {
      const result = await repository.isUserSuperadmin('00000000-0000-0000-0000-000000000000')

      expect(result).toBe(false)
    })
  })

  describe('listAll', () => {
    it('should return only active superadmin users by default', async () => {
      const user2 = await usersRepository.create(
        UserFactory.create({ email: 'admin2@test.com', firebaseUid: 'firebase-admin-2' })
      )
      const user3 = await usersRepository.create(
        UserFactory.create({ email: 'admin3@test.com', firebaseUid: 'firebase-admin-3' })
      )

      await repository.create(SuperadminUserFactory.active({ userId: testUserId }))
      await repository.create(SuperadminUserFactory.active({ userId: user2.id }))
      await repository.create(SuperadminUserFactory.inactive({ userId: user3.id }))

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
      expect(result.every(r => r.isActive)).toBe(true)
    })

    it('should return all superadmin users when includeInactive is true', async () => {
      const user2 = await usersRepository.create(
        UserFactory.create({ email: 'admin2@test.com', firebaseUid: 'firebase-admin-2' })
      )

      await repository.create(SuperadminUserFactory.active({ userId: testUserId }))
      await repository.create(SuperadminUserFactory.inactive({ userId: user2.id }))

      const result = await repository.listAll(true)

      expect(result).toHaveLength(2)
    })
  })

  describe('update', () => {
    it('should update superadmin user fields', async () => {
      const created = await repository.create(
        SuperadminUserFactory.create({ userId: testUserId, notes: 'Old notes' })
      )

      const result = await repository.update(created.id, {
        notes: 'Updated notes',
        isActive: false,
      })

      expect(result?.notes).toBe('Updated notes')
      expect(result?.isActive).toBe(false)
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.update('00000000-0000-0000-0000-000000000000', {
        notes: 'Test',
      })

      expect(result).toBeNull()
    })
  })

  describe('delete (soft delete)', () => {
    it('should soft delete by setting isActive to false', async () => {
      const created = await repository.create(SuperadminUserFactory.active({ userId: testUserId }))

      const result = await repository.delete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found?.isActive).toBe(false)
    })

    it('should return false for non-existent id', async () => {
      const result = await repository.delete('00000000-0000-0000-0000-000000000000')

      expect(result).toBe(false)
    })
  })

  describe('updateLastAccess', () => {
    it('should update lastAccessAt timestamp', async () => {
      const created = await repository.create(SuperadminUserFactory.create({ userId: testUserId }))
      expect(created.lastAccessAt).toBeNull()

      await repository.updateLastAccess(created.id)

      const updated = await repository.getById(created.id)
      expect(updated?.lastAccessAt).toBeDefined()
      expect(updated?.lastAccessAt).toBeInstanceOf(Date)
    })
  })
})
