import { describe, it, expect, beforeEach } from 'bun:test'
import type { TRolePermission } from '@packages/domain'
import { GetPermissionsByRoleService } from '@src/services/role-permissions'

type TMockRepository = {
  getByRoleId: (roleId: string) => Promise<TRolePermission[]>
}

describe('GetPermissionsByRoleService', function () {
  let service: GetPermissionsByRoleService
  let mockRepository: TMockRepository

  const roleId = '550e8400-e29b-41d4-a716-446655440010'

  const mockRolePermissions: TRolePermission[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      roleId,
      permissionId: '550e8400-e29b-41d4-a716-446655440020',
      registeredBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      roleId,
      permissionId: '550e8400-e29b-41d4-a716-446655440021',
      registeredBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByRoleId: async function (requestedRoleId: string) {
        return mockRolePermissions.filter(function (rp) {
          return rp.roleId === requestedRoleId
        })
      },
    }
    service = new GetPermissionsByRoleService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all permissions for a role', async function () {
      const result = await service.execute({ roleId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((rp) => rp.roleId === roleId)).toBe(true)
      }
    })

    it('should return empty array when role has no permissions', async function () {
      const result = await service.execute({ roleId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
