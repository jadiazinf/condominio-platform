import { describe, it, expect, beforeEach } from 'bun:test'
import type { TUnitOwnership } from '@packages/domain'
import { GetOwnershipsByUnitService } from '@src/services/unit-ownerships'

type TMockRepository = {
  getByUnitId: (unitId: string, includeInactive?: boolean) => Promise<TUnitOwnership[]>
}

describe('GetOwnershipsByUnitService', function () {
  let service: GetOwnershipsByUnitService
  let mockRepository: TMockRepository

  const unitId = '550e8400-e29b-41d4-a716-446655440020'

  const mockOwnerships: TUnitOwnership[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      unitId,
      userId: '550e8400-e29b-41d4-a716-446655440010',
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
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      unitId,
      userId: '550e8400-e29b-41d4-a716-446655440011',
      ownershipType: 'tenant',
      ownershipPercentage: null,
      titleDeedNumber: null,
      titleDeedDate: null,
      startDate: '2023-06-01',
      endDate: '2023-12-31',
      isActive: false,
      isPrimaryResidence: false,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByUnitId: async function (requestedUnitId: string, includeInactive?: boolean) {
        return mockOwnerships.filter(function (ownership) {
          if (ownership.unitId !== requestedUnitId) return false
          if (!includeInactive && !ownership.isActive) return false
          return true
        })
      },
    }
    service = new GetOwnershipsByUnitService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return active ownerships for a unit by default', async function () {
      const result = await service.execute({ unitId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(
          result.data.every(ownership => ownership.unitId === unitId && ownership.isActive)
        ).toBe(true)
      }
    })

    it('should return all ownerships when includeInactive is true', async function () {
      const result = await service.execute({ unitId, includeInactive: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(ownership => ownership.unitId === unitId)).toBe(true)
      }
    })

    it('should return empty array when unit has no ownerships', async function () {
      const result = await service.execute({ unitId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
