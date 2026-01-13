import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import { RolesRepository } from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  RoleFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('RolesRepository', () => {
  let db: TTestDrizzleClient
  let repository: RolesRepository

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new RolesRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('create', () => {
    it('should create a new role', async () => {
      const data = RoleFactory.create({
        name: 'Administrator',
        description: 'Full system access',
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.name).toBe('Administrator')
      expect(result.description).toBe('Full system access')
      expect(result.isSystemRole).toBe(false)
    })

    it('should create a system role', async () => {
      const data = RoleFactory.create({
        name: 'SuperAdmin',
        isSystemRole: true,
      })

      const result = await repository.create(data)

      expect(result.isSystemRole).toBe(true)
    })

    it('should throw error on duplicate name', async () => {
      await repository.create(RoleFactory.create({ name: 'DuplicateRole' }))

      await expect(
        repository.create(RoleFactory.create({ name: 'DuplicateRole' }))
      ).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('should return role by id', async () => {
      const created = await repository.create(RoleFactory.create({ name: 'TestRole' }))

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.name).toBe('TestRole')
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')

      expect(result).toBeNull()
    })
  })

  describe('listAll', () => {
    it('should return all roles', async () => {
      await repository.create(RoleFactory.create({ name: 'Role1' }))
      await repository.create(RoleFactory.create({ name: 'Role2' }))
      await repository.create(RoleFactory.create({ name: 'Role3' }))

      const result = await repository.listAll()

      expect(result).toHaveLength(3)
    })
  })

  describe('update', () => {
    it('should update role fields', async () => {
      const created = await repository.create(
        RoleFactory.create({ name: 'OldRoleName', description: 'Old description' })
      )

      const result = await repository.update(created.id, {
        name: 'NewRoleName',
        description: 'New description',
      })

      expect(result?.name).toBe('NewRoleName')
      expect(result?.description).toBe('New description')
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.update('00000000-0000-0000-0000-000000000000', {
        name: 'Test',
      })

      expect(result).toBeNull()
    })
  })

  describe('hardDelete', () => {
    it('should permanently delete role', async () => {
      const created = await repository.create(RoleFactory.create({ name: 'ToDelete' }))

      const result = await repository.hardDelete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found).toBeNull()
    })

    it('should return false for non-existent id', async () => {
      const result = await repository.hardDelete('00000000-0000-0000-0000-000000000000')

      expect(result).toBe(false)
    })
  })

  describe('getByName', () => {
    it('should return role by name', async () => {
      await repository.create(RoleFactory.create({ name: 'Manager' }))

      const result = await repository.getByName('Manager')

      expect(result).toBeDefined()
      expect(result?.name).toBe('Manager')
    })

    it('should return null for non-existent name', async () => {
      const result = await repository.getByName('NonExistent')

      expect(result).toBeNull()
    })
  })

  describe('getSystemRoles', () => {
    it('should return only system roles', async () => {
      await repository.create(RoleFactory.create({ name: 'Regular', isSystemRole: false }))
      await repository.create(RoleFactory.create({ name: 'System1', isSystemRole: true }))
      await repository.create(RoleFactory.create({ name: 'System2', isSystemRole: true }))

      const result = await repository.getSystemRoles()

      expect(result).toHaveLength(2)
      expect(result.every(r => r.isSystemRole)).toBe(true)
    })

    it('should return empty array when no system roles exist', async () => {
      await repository.create(RoleFactory.create({ name: 'Regular', isSystemRole: false }))

      const result = await repository.getSystemRoles()

      expect(result).toEqual([])
    })
  })
})
