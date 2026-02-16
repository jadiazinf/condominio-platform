import { describe, it, expect, beforeEach } from 'bun:test'
import type { TUnitOwnership } from '@packages/domain'
import { GetOwnershipsByUserService } from '@src/services/unit-ownerships'

type TMockRepository = {
  getByUserId: (userId: string, includeInactive?: boolean) => Promise<TUnitOwnership[]>
}

describe('GetOwnershipsByUserService', function () {
  let service: GetOwnershipsByUserService
  let mockRepository: TMockRepository

  const userId = '550e8400-e29b-41d4-a716-446655440010'

  const mockOwnerships: TUnitOwnership[] = [
    {
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
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      unitId: '550e8400-e29b-41d4-a716-446655440021',
      userId,
      ownershipType: 'co-owner',
      ownershipPercentage: '50.00',
      titleDeedNumber: 'TD-002',
      titleDeedDate: '2022-06-01',
      startDate: '2022-06-01',
      endDate: '2023-05-31',
      isActive: false,
      isPrimaryResidence: false,
      fullName: 'Test Co-Owner',
      email: null,
      phone: null,
      phoneCountryCode: null,
      isRegistered: true,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByUserId: async function (requestedUserId: string, includeInactive?: boolean) {
        return mockOwnerships.filter(function (ownership) {
          if (ownership.userId !== requestedUserId) return false
          if (!includeInactive && !ownership.isActive) return false
          return true
        })
      },
    }
    service = new GetOwnershipsByUserService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return active ownerships for a user by default', async function () {
      const result = await service.execute({ userId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(
          result.data.every(ownership => ownership.userId === userId && ownership.isActive)
        ).toBe(true)
      }
    })

    it('should return all ownerships when includeInactive is true', async function () {
      const result = await service.execute({ userId, includeInactive: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(ownership => ownership.userId === userId)).toBe(true)
      }
    })

    it('should return empty array when user has no ownerships', async function () {
      const result = await service.execute({ userId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
