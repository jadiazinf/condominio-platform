import { describe, it, expect, beforeEach } from 'bun:test'
import { CheckUserHasRoleService } from '@src/services/user-roles'

type TMockRepository = {
  userHasRole: (
    userId: string,
    roleId: string,
    condominiumId?: string,
    buildingId?: string
  ) => Promise<boolean>
}

describe('CheckUserHasRoleService', function () {
  let service: CheckUserHasRoleService
  let mockRepository: TMockRepository

  const userId = '550e8400-e29b-41d4-a716-446655440010'
  const roleId = '550e8400-e29b-41d4-a716-446655440030'
  const condominiumId = '550e8400-e29b-41d4-a716-446655440040'
  const buildingId = '550e8400-e29b-41d4-a716-446655440060'

  beforeEach(function () {
    mockRepository = {
      userHasRole: async function (
        requestedUserId: string,
        requestedRoleId: string,
        requestedCondominiumId?: string,
        requestedBuildingId?: string
      ) {
        // Simulate that user has the role only for specific combinations
        if (requestedUserId === userId && requestedRoleId === roleId) {
          if (!requestedCondominiumId && !requestedBuildingId) {
            return true // Global role
          }
          if (requestedCondominiumId === condominiumId && !requestedBuildingId) {
            return true // Condominium role
          }
          if (requestedCondominiumId === condominiumId && requestedBuildingId === buildingId) {
            return true // Building role
          }
        }
        return false
      },
    }
    service = new CheckUserHasRoleService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return true when user has the role globally', async function () {
      const result = await service.execute({ userId, roleId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.hasRole).toBe(true)
      }
    })

    it('should return true when user has the role in condominium', async function () {
      const result = await service.execute({ userId, roleId, condominiumId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.hasRole).toBe(true)
      }
    })

    it('should return true when user has the role in building', async function () {
      const result = await service.execute({ userId, roleId, condominiumId, buildingId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.hasRole).toBe(true)
      }
    })

    it('should return false when user does not have the role', async function () {
      const result = await service.execute({
        userId: '550e8400-e29b-41d4-a716-446655440099',
        roleId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.hasRole).toBe(false)
      }
    })

    it('should return false when user has role but not in specified condominium', async function () {
      const result = await service.execute({
        userId,
        roleId,
        condominiumId: '550e8400-e29b-41d4-a716-446655440099',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.hasRole).toBe(false)
      }
    })

    it('should return false when user has role but not in specified building', async function () {
      const result = await service.execute({
        userId,
        roleId,
        condominiumId,
        buildingId: '550e8400-e29b-41d4-a716-446655440099',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.hasRole).toBe(false)
      }
    })
  })
})
