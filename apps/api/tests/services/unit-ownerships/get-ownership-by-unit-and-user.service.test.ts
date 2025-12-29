import { describe, it, expect, beforeEach } from 'bun:test'
import type { TUnitOwnership } from '@packages/domain'
import { GetOwnershipByUnitAndUserService } from '@src/services/unit-ownerships'

type TMockRepository = {
  getByUnitAndUser: (unitId: string, userId: string) => Promise<TUnitOwnership | null>
}

describe('GetOwnershipByUnitAndUserService', function () {
  let service: GetOwnershipByUnitAndUserService
  let mockRepository: TMockRepository

  const unitId = '550e8400-e29b-41d4-a716-446655440020'
  const userId = '550e8400-e29b-41d4-a716-446655440010'

  const mockOwnership: TUnitOwnership = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    unitId,
    userId,
    ownershipType: 'owner',
    ownershipPercentage: '100.00',
    titleDeedNumber: 'TD-001',
    titleDeedDate: '2023-01-15',
    startDate: '2023-01-15',
    endDate: null,
    isActive: true,
    isPrimaryResidence: true,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(function () {
    mockRepository = {
      getByUnitAndUser: async function (requestedUnitId: string, requestedUserId: string) {
        if (requestedUnitId === unitId && requestedUserId === userId) {
          return mockOwnership
        }
        return null
      },
    }
    service = new GetOwnershipByUnitAndUserService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return ownership when found', async function () {
      const result = await service.execute({ unitId, userId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.unitId).toBe(unitId)
        expect(result.data.userId).toBe(userId)
        expect(result.data.id).toBe(mockOwnership.id)
      }
    })

    it('should return NOT_FOUND error when ownership does not exist', async function () {
      const result = await service.execute({
        unitId: '550e8400-e29b-41d4-a716-446655440099',
        userId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Unit ownership not found')
      }
    })

    it('should return NOT_FOUND error when user does not own unit', async function () {
      const result = await service.execute({
        unitId,
        userId: '550e8400-e29b-41d4-a716-446655440099',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Unit ownership not found')
      }
    })
  })
})
