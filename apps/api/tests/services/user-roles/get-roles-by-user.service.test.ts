import { describe, it, expect, beforeEach } from 'bun:test'
import type { TUserRole } from '@packages/domain'
import { GetRolesByUserService } from '@src/services/user-roles'

type TMockRepository = {
  getByUserId: (userId: string) => Promise<TUserRole[]>
}

describe('GetRolesByUserService', function () {
  let service: GetRolesByUserService
  let mockRepository: TMockRepository

  const userId = '550e8400-e29b-41d4-a716-446655440010'

  const mockUserRoles: TUserRole[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      userId,
      roleId: '550e8400-e29b-41d4-a716-446655440030',
      condominiumId: '550e8400-e29b-41d4-a716-446655440040',
      buildingId: null,
      assignedAt: new Date(),
      assignedBy: '550e8400-e29b-41d4-a716-446655440050',
      registeredBy: null,
      expiresAt: null,
      isActive: true,
      notes: null,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      userId,
      roleId: '550e8400-e29b-41d4-a716-446655440031',
      condominiumId: null,
      buildingId: null,
      assignedAt: new Date(),
      assignedBy: '550e8400-e29b-41d4-a716-446655440050',
      registeredBy: null,
      expiresAt: null,
      isActive: true,
      notes: null,
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByUserId: async function (requestedUserId: string) {
        return mockUserRoles.filter(function (role) {
          return role.userId === requestedUserId
        })
      },
    }
    service = new GetRolesByUserService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all roles for a user', async function () {
      const result = await service.execute({ userId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(role => role.userId === userId)).toBe(true)
      }
    })

    it('should return empty array when user has no roles', async function () {
      const result = await service.execute({ userId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
