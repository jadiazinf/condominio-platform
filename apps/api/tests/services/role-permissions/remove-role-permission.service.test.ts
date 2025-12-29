import { describe, it, expect, beforeEach } from 'bun:test'
import { RemoveRolePermissionService } from '@src/services/role-permissions'

type TMockRepository = {
  removeByRoleAndPermission: (roleId: string, permissionId: string) => Promise<boolean>
}

describe('RemoveRolePermissionService', function () {
  let service: RemoveRolePermissionService
  let mockRepository: TMockRepository

  const existingRoleId = '550e8400-e29b-41d4-a716-446655440010'
  const existingPermissionId = '550e8400-e29b-41d4-a716-446655440020'
  const nonExistingRoleId = '550e8400-e29b-41d4-a716-446655440099'
  const nonExistingPermissionId = '550e8400-e29b-41d4-a716-446655440098'

  beforeEach(function () {
    mockRepository = {
      removeByRoleAndPermission: async function (roleId: string, permissionId: string) {
        return roleId === existingRoleId && permissionId === existingPermissionId
      },
    }
    service = new RemoveRolePermissionService(mockRepository as never)
  })

  describe('execute', function () {
    it('should successfully remove an existing role-permission', async function () {
      const result = await service.execute({
        roleId: existingRoleId,
        permissionId: existingPermissionId,
      })

      expect(result.success).toBe(true)
    })

    it('should return failure when role-permission does not exist', async function () {
      const result = await service.execute({
        roleId: nonExistingRoleId,
        permissionId: existingPermissionId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Role-permission assignment not found')
        expect(result.code).toBe('NOT_FOUND')
      }
    })

    it('should return failure when permission does not exist for role', async function () {
      const result = await service.execute({
        roleId: existingRoleId,
        permissionId: nonExistingPermissionId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Role-permission assignment not found')
        expect(result.code).toBe('NOT_FOUND')
      }
    })
  })
})
