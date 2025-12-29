import { describe, it, expect, beforeEach } from 'bun:test'
import { CheckRolePermissionExistsService } from '@src/services/role-permissions'

type TMockRepository = {
  exists: (roleId: string, permissionId: string) => Promise<boolean>
}

describe('CheckRolePermissionExistsService', function () {
  let service: CheckRolePermissionExistsService
  let mockRepository: TMockRepository

  const existingRoleId = '550e8400-e29b-41d4-a716-446655440010'
  const existingPermissionId = '550e8400-e29b-41d4-a716-446655440020'
  const nonExistingRoleId = '550e8400-e29b-41d4-a716-446655440099'
  const nonExistingPermissionId = '550e8400-e29b-41d4-a716-446655440098'

  beforeEach(function () {
    mockRepository = {
      exists: async function (roleId: string, permissionId: string) {
        return roleId === existingRoleId && permissionId === existingPermissionId
      },
    }
    service = new CheckRolePermissionExistsService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return true when role-permission exists', async function () {
      const result = await service.execute({
        roleId: existingRoleId,
        permissionId: existingPermissionId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.exists).toBe(true)
      }
    })

    it('should return false when role-permission does not exist', async function () {
      const result = await service.execute({
        roleId: nonExistingRoleId,
        permissionId: existingPermissionId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.exists).toBe(false)
      }
    })

    it('should return false when permission does not exist for role', async function () {
      const result = await service.execute({
        roleId: existingRoleId,
        permissionId: nonExistingPermissionId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.exists).toBe(false)
      }
    })
  })
})
