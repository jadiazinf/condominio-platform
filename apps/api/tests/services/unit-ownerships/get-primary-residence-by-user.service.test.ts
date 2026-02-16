import { describe, it, expect, beforeEach } from 'bun:test'
import type { TUnitOwnership } from '@packages/domain'
import { GetPrimaryResidenceByUserService } from '@src/services/unit-ownerships'

type TMockRepository = {
  getPrimaryResidenceByUser: (userId: string) => Promise<TUnitOwnership | null>
}

describe('GetPrimaryResidenceByUserService', function () {
  let service: GetPrimaryResidenceByUserService
  let mockRepository: TMockRepository

  const userId = '550e8400-e29b-41d4-a716-446655440010'

  const mockOwnership: TUnitOwnership = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    unitId: '550e8400-e29b-41d4-a716-446655440020',
    userId,
    ownershipType: 'owner',
    ownershipPercentage: '100.00',
    titleDeedNumber: 'TD-001',
    titleDeedDate: '2023-01-15',
    startDate: '2023-01-15',
    endDate: null,
    isActive: true,
    isPrimaryResidence: true,
    fullName: 'Test Owner',
    email: null,
    phone: null,
    phoneCountryCode: null,
    isRegistered: true,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(function () {
    mockRepository = {
      getPrimaryResidenceByUser: async function (requestedUserId: string) {
        if (requestedUserId === userId) {
          return mockOwnership
        }
        return null
      },
    }
    service = new GetPrimaryResidenceByUserService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return primary residence when found', async function () {
      const result = await service.execute({ userId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.userId).toBe(userId)
        expect(result.data.isPrimaryResidence).toBe(true)
        expect(result.data.id).toBe(mockOwnership.id)
      }
    })

    it('should return NOT_FOUND error when user has no primary residence', async function () {
      const result = await service.execute({ userId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('No primary residence found for user')
      }
    })
  })
})
