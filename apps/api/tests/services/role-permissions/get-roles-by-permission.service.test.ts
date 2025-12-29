import { describe, it, expect, beforeEach } from 'bun:test'
import type { TRolePermission } from '@packages/domain'
import { GetRolesByPermissionService } from '@src/services/role-permissions'

type TMockRepository = {
  getByPermissionId: (permissionId: string) => Promise<TRolePermission[]>
}

describe('GetRolesByPermissionService', function () {
  let service: GetRolesByPermissionService
  let mockRepository: TMockRepository

  const permissionId = '550e8400-e29b-41d4-a716-446655440020'

  const mockRolePermissions: TRolePermission[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      roleId: '550e8400-e29b-41d4-a716-446655440010',
      permissionId,
      registeredBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      roleId: '550e8400-e29b-41d4-a716-446655440011',
      permissionId,
      registeredBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByPermissionId: async function (requestedPermissionId: string) {
        return mockRolePermissions.filter(function (rp) {
          return rp.permissionId === requestedPermissionId
        })
      },
    }
    service = new GetRolesByPermissionService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all roles for a permission', async function () {
      const result = await service.execute({ permissionId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((rp) => rp.permissionId === permissionId)).toBe(true)
      }
    })

    it('should return empty array when permission has no roles', async function () {
      const result = await service.execute({ permissionId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
