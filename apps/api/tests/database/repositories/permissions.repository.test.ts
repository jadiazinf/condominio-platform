import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import { PermissionsRepository } from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  PermissionFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('PermissionsRepository', () => {
  let db: TTestDrizzleClient
  let repository: PermissionsRepository

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new PermissionsRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)
  })

  describe('create', () => {
    it('should create a new permission', async () => {
      const data = PermissionFactory.create({
        name: 'users.create',
        module: 'users',
        action: 'create',
        description: 'Create users',
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.name).toBe('users.create')
      expect(result.module).toBe('users')
      expect(result.action).toBe('create')
    })

    it('should throw error on duplicate name', async () => {
      await repository.create(
        PermissionFactory.create({ name: 'duplicate', module: 'users', action: 'read' })
      )

      await expect(
        repository.create(
          PermissionFactory.create({ name: 'duplicate', module: 'payments', action: 'create' })
        )
      ).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('should return permission by id', async () => {
      const created = await repository.create(
        PermissionFactory.create({ name: 'test.permission', module: 'users', action: 'read' })
      )

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.name).toBe('test.permission')
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')

      expect(result).toBeNull()
    })
  })

  describe('listAll', () => {
    it('should return all permissions', async () => {
      await repository.create(
        PermissionFactory.create({ name: 'perm1', module: 'users', action: 'create' })
      )
      await repository.create(
        PermissionFactory.create({ name: 'perm2', module: 'payments', action: 'read' })
      )

      const result = await repository.listAll()

      expect(result).toHaveLength(2)
    })
  })

  describe('update', () => {
    it('should update permission fields', async () => {
      const created = await repository.create(
        PermissionFactory.create({ name: 'old.name', description: 'Old' })
      )

      const result = await repository.update(created.id, {
        name: 'new.name',
        description: 'New description',
      })

      expect(result?.name).toBe('new.name')
      expect(result?.description).toBe('New description')
    })
  })

  describe('hardDelete', () => {
    it('should permanently delete permission', async () => {
      const created = await repository.create(
        PermissionFactory.create({ name: 'to.delete', module: 'users', action: 'delete' })
      )

      const result = await repository.hardDelete(created.id)

      expect(result).toBe(true)

      const found = await repository.getById(created.id)
      expect(found).toBeNull()
    })
  })

  describe('getByModuleAndAction', () => {
    it('should return permission by module and action', async () => {
      await repository.create(
        PermissionFactory.create({ name: 'search.permission', module: 'users', action: 'read' })
      )

      const result = await repository.getByModuleAndAction('users', 'read')

      expect(result).toBeDefined()
      expect(result?.module).toBe('users')
      expect(result?.action).toBe('read')
    })

    it('should return null for non-existent combination', async () => {
      const result = await repository.getByModuleAndAction('users', 'approve')

      expect(result).toBeNull()
    })
  })

  describe('getByModule', () => {
    it('should return permissions by module', async () => {
      await repository.create(
        PermissionFactory.create({ name: 'p1', module: 'users', action: 'create' })
      )
      await repository.create(
        PermissionFactory.create({ name: 'p2', module: 'users', action: 'read' })
      )
      await repository.create(
        PermissionFactory.create({ name: 'p3', module: 'payments', action: 'create' })
      )

      const result = await repository.getByModule('users')

      expect(result).toHaveLength(2)
      expect(result.every((p: { module: string }) => p.module === 'users')).toBe(true)
    })

    it('should return empty array for non-existent module', async () => {
      const result = await repository.getByModule('condominiums')

      expect(result).toEqual([])
    })
  })
})
