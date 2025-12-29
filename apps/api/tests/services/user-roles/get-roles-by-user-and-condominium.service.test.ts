import { describe, it, expect, beforeEach } from 'bun:test'
import type { TUserRole } from '@packages/domain'
import { GetRolesByUserAndCondominiumService } from '@src/services/user-roles'

type TMockRepository = {
  getByUserAndCondominium: (userId: string, condominiumId: string) => Promise<TUserRole[]>
}

describe('GetRolesByUserAndCondominiumService', function () {
  let service: GetRolesByUserAndCondominiumService
  let mockRepository: TMockRepository

  const userId = '550e8400-e29b-41d4-a716-446655440010'
  const condominiumId = '550e8400-e29b-41d4-a716-446655440040'

  const mockUserRoles: TUserRole[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      userId,
      roleId: '550e8400-e29b-41d4-a716-446655440030',
      condominiumId,
      buildingId: null,
      assignedAt: new Date(),
      assignedBy: '550e8400-e29b-41d4-a716-446655440050',
      registeredBy: null,
      expiresAt: null,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      userId,
      roleId: '550e8400-e29b-41d4-a716-446655440031',
      condominiumId,
      buildingId: '550e8400-e29b-41d4-a716-446655440060',
      assignedAt: new Date(),
      assignedBy: '550e8400-e29b-41d4-a716-446655440050',
      registeredBy: null,
      expiresAt: null,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      userId,
      roleId: '550e8400-e29b-41d4-a716-446655440032',
      condominiumId: '550e8400-e29b-41d4-a716-446655440041',
      buildingId: null,
      assignedAt: new Date(),
      assignedBy: '550e8400-e29b-41d4-a716-446655440050',
      registeredBy: null,
      expiresAt: null,
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByUserAndCondominium: async function (requestedUserId: string, requestedCondominiumId: string) {
        return mockUserRoles.filter(function (role) {
          return role.userId === requestedUserId && role.condominiumId === requestedCondominiumId
        })
      },
    }
    service = new GetRolesByUserAndCondominiumService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all roles for a user in a specific condominium', async function () {
      const result = await service.execute({ userId, condominiumId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((role) => role.userId === userId && role.condominiumId === condominiumId)).toBe(true)
      }
    })

    it('should return empty array when user has no roles in condominium', async function () {
      const result = await service.execute({
        userId,
        condominiumId: '550e8400-e29b-41d4-a716-446655440099',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })

    it('should return roles for different condominium', async function () {
      const result = await service.execute({
        userId,
        condominiumId: '550e8400-e29b-41d4-a716-446655440041',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        const role = result.data[0]
        expect(role).toBeDefined()
        expect(role!.condominiumId).toBe('550e8400-e29b-41d4-a716-446655440041')
      }
    })
  })
})
