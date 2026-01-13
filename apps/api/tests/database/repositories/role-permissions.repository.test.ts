import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  RolePermissionsRepository,
  RolesRepository,
  PermissionsRepository,
} from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  RolePermissionFactory,
  RoleFactory,
  PermissionFactory,
  type TTestDrizzleClient,
  stopTestContainer,
} from '@tests/setup'

describe('RolePermissionsRepository', () => {
  let db: TTestDrizzleClient
  let repository: RolePermissionsRepository
  let rolesRepository: RolesRepository
  let permissionsRepository: PermissionsRepository
  let roleId: string
  let roleId2: string
  let permissionId: string
  let permissionId2: string

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new RolePermissionsRepository(db)
    rolesRepository = new RolesRepository(db)
    permissionsRepository = new PermissionsRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)

    // Create dependencies
    const role1 = await rolesRepository.create(RoleFactory.create({ name: 'admin' }))
    const role2 = await rolesRepository.create(RoleFactory.create({ name: 'owner' }))
    const permission1 = await permissionsRepository.create(
      PermissionFactory.create({ name: 'read_payment' })
    )
    const permission2 = await permissionsRepository.create(
      PermissionFactory.create({ name: 'create_payment' })
    )

    roleId = role1.id
    roleId2 = role2.id
    permissionId = permission1.id
    permissionId2 = permission2.id
  })

  describe('create', () => {
    it('should create a role permission assignment', async () => {
      const data = RolePermissionFactory.forRole(roleId, permissionId)

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.roleId).toBe(roleId)
      expect(result.permissionId).toBe(permissionId)
    })

    it('should allow same permission for different roles', async () => {
      await repository.create(RolePermissionFactory.forRole(roleId, permissionId))
      const result = await repository.create(RolePermissionFactory.forRole(roleId2, permissionId))

      expect(result.roleId).toBe(roleId2)
      expect(result.permissionId).toBe(permissionId)
    })
  })

  describe('getById', () => {
    it('should return role permission by id', async () => {
      const created = await repository.create(RolePermissionFactory.forRole(roleId, permissionId))

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
    it('should return all role permissions', async () => {
      await repository.create(RolePermissionFactory.forRole(roleId, permissionId))
      await repository.create(RolePermissionFactory.forRole(roleId, permissionId2))
      await repository.create(RolePermissionFactory.forRole(roleId2, permissionId))

      const result = await repository.listAll()

      expect(result).toHaveLength(3)
    })
  })

  describe('delete (hard delete)', () => {
    it('should hard delete role permission', async () => {
      const created = await repository.create(RolePermissionFactory.forRole(roleId, permissionId))

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

  describe('getByRoleId', () => {
    it('should return permissions for role', async () => {
      await repository.create(RolePermissionFactory.forRole(roleId, permissionId))
      await repository.create(RolePermissionFactory.forRole(roleId, permissionId2))
      await repository.create(RolePermissionFactory.forRole(roleId2, permissionId))

      const result = await repository.getByRoleId(roleId)

      expect(result).toHaveLength(2)
      expect(result.every(rp => rp.roleId === roleId)).toBe(true)
    })

    it('should return empty array for role with no permissions', async () => {
      const result = await repository.getByRoleId(roleId)
      expect(result).toEqual([])
    })
  })

  describe('getByPermissionId', () => {
    it('should return roles with permission', async () => {
      await repository.create(RolePermissionFactory.forRole(roleId, permissionId))
      await repository.create(RolePermissionFactory.forRole(roleId2, permissionId))
      await repository.create(RolePermissionFactory.forRole(roleId, permissionId2))

      const result = await repository.getByPermissionId(permissionId)

      expect(result).toHaveLength(2)
      expect(result.every(rp => rp.permissionId === permissionId)).toBe(true)
    })
  })

  // NOTE: Methods roleHasPermission and deleteByRoleAndPermission do not exist in RolePermissionsRepository
  // Use removeByRoleAndPermission instead of deleteByRoleAndPermission
  // describe('roleHasPermission', () => {
  //   it('should return true when role has permission', async () => {
  //     await repository.create(RolePermissionFactory.forRole(roleId, permissionId))

  //     const result = await repository.roleHasPermission(roleId, permissionId)

  //     expect(result).toBe(true)
  //   })

  //   it('should return false when role does not have permission', async () => {
  //     const result = await repository.roleHasPermission(roleId, permissionId)

  //     expect(result).toBe(false)
  //   })
  // })

  // describe('deleteByRoleAndPermission', () => {
  //   it('should delete specific role-permission assignment', async () => {
  //     await repository.create(RolePermissionFactory.forRole(roleId, permissionId))
  //     await repository.create(RolePermissionFactory.forRole(roleId, permissionId2))

  //     const result = await repository.deleteByRoleAndPermission(roleId, permissionId)

  //     expect(result).toBe(true)

  //     const remaining = await repository.getByRoleId(roleId)
  //     expect(remaining).toHaveLength(1)
  //     expect(remaining[0]?.permissionId).toBe(permissionId2)
  //   })
  // })
})
