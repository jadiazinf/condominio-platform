import { describe, it, expect, beforeEach } from 'bun:test'
import type { TUserRole } from '@packages/domain'
import { GetGlobalRolesByUserService } from '@src/services/user-roles'

type TMockRepository = {
  getGlobalRolesByUser: (userId: string) => Promise<TUserRole[]>
}

describe('GetGlobalRolesByUserService', function () {
  let service: GetGlobalRolesByUserService
  let mockRepository: TMockRepository

  const userId = '550e8400-e29b-41d4-a716-446655440010'

  const mockUserRoles: TUserRole[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      userId,
      roleId: '550e8400-e29b-41d4-a716-446655440030',
      condominiumId: null,
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
      getGlobalRolesByUser: async function (requestedUserId: string) {
        return mockUserRoles.filter(function (role) {
          return (
            role.userId === requestedUserId &&
            role.condominiumId === null &&
            role.buildingId === null
          )
        })
      },
    }
    service = new GetGlobalRolesByUserService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all global roles for a user', async function () {
      const result = await service.execute({ userId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(role => role.userId === userId)).toBe(true)
        expect(
          result.data.every(role => role.condominiumId === null && role.buildingId === null)
        ).toBe(true)
      }
    })

    it('should return empty array when user has no global roles', async function () {
      const result = await service.execute({ userId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
