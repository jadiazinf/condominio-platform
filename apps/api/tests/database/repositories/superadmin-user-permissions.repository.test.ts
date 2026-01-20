import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  SuperadminUserPermissionsRepository,
  SuperadminUsersRepository,
  UsersRepository,
  PermissionsRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  SuperadminUserFactory,
  SuperadminUserPermissionFactory,
  UserFactory,
  PermissionFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('SuperadminUserPermissionsRepository', () => {
  let db: TTestDrizzleClient
  let repository: SuperadminUserPermissionsRepository
  let superadminUsersRepository: SuperadminUsersRepository
  let usersRepository: UsersRepository
  let permissionsRepository: PermissionsRepository
  let testSuperadminId: string
  let testPermissionId: string
  let testPermission2Id: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new SuperadminUserPermissionsRepository(db)
    superadminUsersRepository = new SuperadminUsersRepository(db)
    usersRepository = new UsersRepository(db)
    permissionsRepository = new PermissionsRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)

    // Create test user and superadmin
    const user = await usersRepository.create(
      UserFactory.create({ email: 'superadmin@test.com', firebaseUid: 'firebase-superadmin-1' })
    )
    const superadmin = await superadminUsersRepository.create(
      SuperadminUserFactory.create({ userId: user.id })
    )
    testSuperadminId = superadmin.id

    // Create test permissions
    const permission1 = await permissionsRepository.create(
      PermissionFactory.create({ module: 'users', action: 'read' })
    )
    const permission2 = await permissionsRepository.create(
      PermissionFactory.create({ module: 'users', action: 'update' })
    )
    testPermissionId = permission1.id
    testPermission2Id = permission2.id
  })

  describe('create', () => {
    it('should create a new superadmin user permission', async () => {
      const data = SuperadminUserPermissionFactory.create({
        superadminUserId: testSuperadminId,
        permissionId: testPermissionId,
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.superadminUserId).toBe(testSuperadminId)
      expect(result.permissionId).toBe(testPermissionId)
    })

    it('should throw error on duplicate permission assignment', async () => {
      await repository.create(
        SuperadminUserPermissionFactory.create({
          superadminUserId: testSuperadminId,
          permissionId: testPermissionId,
        })
      )

      await expect(
        repository.create(
          SuperadminUserPermissionFactory.create({
            superadminUserId: testSuperadminId,
            permissionId: testPermissionId,
          })
        )
      ).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('should return permission assignment by id', async () => {
      const created = await repository.create(
        SuperadminUserPermissionFactory.create({
          superadminUserId: testSuperadminId,
          permissionId: testPermissionId,
        })
      )

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.superadminUserId).toBe(testSuperadminId)
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')

      expect(result).toBeNull()
    })
  })

  describe('getBySuperadminUserId', () => {
    it('should return all permissions for a superadmin user', async () => {
      await repository.create(
        SuperadminUserPermissionFactory.create({
          superadminUserId: testSuperadminId,
          permissionId: testPermissionId,
        })
      )
      await repository.create(
        SuperadminUserPermissionFactory.create({
          superadminUserId: testSuperadminId,
          permissionId: testPermission2Id,
        })
      )

      const result = await repository.getBySuperadminUserId(testSuperadminId)

      expect(result).toHaveLength(2)
      expect(result.every(r => r.superadminUserId === testSuperadminId)).toBe(true)
    })

    it('should return empty array for non-existent superadmin', async () => {
      const result = await repository.getBySuperadminUserId('00000000-0000-0000-0000-000000000000')

      expect(result).toEqual([])
    })
  })

  describe('hasPermission', () => {
    it('should return true when superadmin has the permission', async () => {
      await repository.create(
        SuperadminUserPermissionFactory.create({
          superadminUserId: testSuperadminId,
          permissionId: testPermissionId,
        })
      )

      const result = await repository.hasPermission(testSuperadminId, testPermissionId)

      expect(result).toBe(true)
    })

    it('should return false when superadmin does not have the permission', async () => {
      const result = await repository.hasPermission(testSuperadminId, testPermissionId)

      expect(result).toBe(false)
    })

    it('should return false for non-existent superadmin', async () => {
      const result = await repository.hasPermission(
        '00000000-0000-0000-0000-000000000000',
        testPermissionId
      )

      expect(result).toBe(false)
    })
  })

  describe('listAll', () => {
    it('should return all permission assignments', async () => {
      await repository.create(
        SuperadminUserPermissionFactory.create({
          superadminUserId: testSuperadminId,
          permissionId: testPermissionId,
        })
      )
      await repository.create(
        SuperadminUserPermissionFactory.create({
          superadminUserId: testSuperadminId,
          permissionId: testPermission2Id,
        })
      )

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
    })
  })

  describe('delete (hard delete)', () => {
    it('should permanently delete permission assignment', async () => {
      const created = await repository.create(
        SuperadminUserPermissionFactory.create({
          superadminUserId: testSuperadminId,
          permissionId: testPermissionId,
        })
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

  describe('deleteByPermissionId', () => {
    it('should delete permission by superadminUserId and permissionId', async () => {
      await repository.create(
        SuperadminUserPermissionFactory.create({
          superadminUserId: testSuperadminId,
          permissionId: testPermissionId,
        })
      )

      const result = await repository.deleteByPermissionId(testSuperadminId, testPermissionId)

      expect(result).toBe(true)

      const hasPermission = await repository.hasPermission(testSuperadminId, testPermissionId)
      expect(hasPermission).toBe(false)
    })

    it('should return false when permission assignment does not exist', async () => {
      const result = await repository.deleteByPermissionId(testSuperadminId, testPermissionId)

      expect(result).toBe(false)
    })
  })
})
