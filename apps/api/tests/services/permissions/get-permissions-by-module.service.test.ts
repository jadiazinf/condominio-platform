import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPermission } from '@packages/domain'
import { GetPermissionsByModuleService } from '@src/services/permissions'

type TMockRepository = {
  getByModule: (module: string) => Promise<TPermission[]>
}

describe('GetPermissionsByModuleService', function () {
  let service: GetPermissionsByModuleService
  let mockRepository: TMockRepository

  const mockPermissions: TPermission[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'payments:create',
      description: 'Create payments',
      module: 'payments',
      action: 'create',
      registeredBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'payments:read',
      description: 'Read payments',
      module: 'payments',
      action: 'read',
      registeredBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'payments:update',
      description: 'Update payments',
      module: 'payments',
      action: 'update',
      registeredBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      name: 'users:create',
      description: 'Create users',
      module: 'users',
      action: 'create',
      registeredBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByModule: async function (module: string) {
        return mockPermissions.filter(function (p) {
          return p.module === module
        })
      },
    }
    service = new GetPermissionsByModuleService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all permissions for a module', async function () {
      const result = await service.execute({ module: 'payments' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(3)
        expect(result.data.every(p => p.module === 'payments')).toBe(true)
      }
    })

    it('should return permissions for different module', async function () {
      const result = await service.execute({ module: 'users' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0]?.module).toBe('users')
      }
    })

    it('should return empty array when module has no permissions', async function () {
      const result = await service.execute({ module: 'documents' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
