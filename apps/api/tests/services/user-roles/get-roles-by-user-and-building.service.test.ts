import { describe, it, expect, beforeEach } from 'bun:test'
import type { TUserRole } from '@packages/domain'
import { GetRolesByUserAndBuildingService } from '@src/services/user-roles'

type TMockRepository = {
  getByUserAndBuilding: (userId: string, buildingId: string) => Promise<TUserRole[]>
}

describe('GetRolesByUserAndBuildingService', function () {
  let service: GetRolesByUserAndBuildingService
  let mockRepository: TMockRepository

  const userId = '550e8400-e29b-41d4-a716-446655440010'
  const buildingId = '550e8400-e29b-41d4-a716-446655440060'

  const mockUserRoles: TUserRole[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      userId,
      roleId: '550e8400-e29b-41d4-a716-446655440030',
      condominiumId: '550e8400-e29b-41d4-a716-446655440040',
      buildingId,
      assignedAt: new Date(),
      assignedBy: '550e8400-e29b-41d4-a716-446655440050',
      registeredBy: null,
      expiresAt: null,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      userId,
      roleId: '550e8400-e29b-41d4-a716-446655440031',
      condominiumId: '550e8400-e29b-41d4-a716-446655440040',
      buildingId,
      assignedAt: new Date(),
      assignedBy: '550e8400-e29b-41d4-a716-446655440050',
      registeredBy: null,
      expiresAt: null,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      userId,
      roleId: '550e8400-e29b-41d4-a716-446655440032',
      condominiumId: '550e8400-e29b-41d4-a716-446655440040',
      buildingId: '550e8400-e29b-41d4-a716-446655440061',
      assignedAt: new Date(),
      assignedBy: '550e8400-e29b-41d4-a716-446655440050',
      registeredBy: null,
      expiresAt: null,
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByUserAndBuilding: async function (requestedUserId: string, requestedBuildingId: string) {
        return mockUserRoles.filter(function (role) {
          return role.userId === requestedUserId && role.buildingId === requestedBuildingId
        })
      },
    }
    service = new GetRolesByUserAndBuildingService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all roles for a user in a specific building', async function () {
      const result = await service.execute({ userId, buildingId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(
          result.data.every(role => role.userId === userId && role.buildingId === buildingId)
        ).toBe(true)
      }
    })

    it('should return empty array when user has no roles in building', async function () {
      const result = await service.execute({
        userId,
        buildingId: '550e8400-e29b-41d4-a716-446655440099',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })

    it('should return roles for different building', async function () {
      const result = await service.execute({
        userId,
        buildingId: '550e8400-e29b-41d4-a716-446655440061',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        const role = result.data[0]
        expect(role).toBeDefined()
        expect(role!.buildingId).toBe('550e8400-e29b-41d4-a716-446655440061')
      }
    })
  })
})
