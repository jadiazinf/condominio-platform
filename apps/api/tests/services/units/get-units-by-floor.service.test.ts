import { describe, it, expect, beforeEach } from 'bun:test'
import type { TUnit } from '@packages/domain'
import { GetUnitsByFloorService } from '@src/services/units'

type TMockRepository = {
  getByFloor: (buildingId: string, floor: number) => Promise<TUnit[]>
}

describe('GetUnitsByFloorService', function () {
  let service: GetUnitsByFloorService
  let mockRepository: TMockRepository

  const buildingId = '550e8400-e29b-41d4-a716-446655440010'

  const mockUnits: TUnit[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      buildingId,
      unitNumber: '101',
      floor: 1,
      areaM2: '85.00',
      bedrooms: 2,
      bathrooms: 2,
      parkingSpaces: 1,
      parkingIdentifiers: ['P-101'],
      storageIdentifier: null,
      aliquotPercentage: '2.5',
      isActive: true,
      metadata: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      buildingId,
      unitNumber: '102',
      floor: 1,
      areaM2: '90.00',
      bedrooms: 3,
      bathrooms: 2,
      parkingSpaces: 2,
      parkingIdentifiers: ['P-102', 'P-103'],
      storageIdentifier: 'S-102',
      aliquotPercentage: '2.8',
      isActive: true,
      metadata: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      buildingId,
      unitNumber: '201',
      floor: 2,
      areaM2: '95.00',
      bedrooms: 3,
      bathrooms: 2,
      parkingSpaces: 1,
      parkingIdentifiers: ['P-201'],
      storageIdentifier: null,
      aliquotPercentage: '3.0',
      isActive: true,
      metadata: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByFloor: async function (reqBuildingId: string, floor: number) {
        return mockUnits.filter(function (u) {
          return u.buildingId === reqBuildingId && u.floor === floor
        })
      },
    }
    service = new GetUnitsByFloorService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return units on the specified floor', async function () {
      const result = await service.execute({ buildingId, floor: 1 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(u => u.floor === 1)).toBe(true)
      }
    })

    it('should return units on floor 2', async function () {
      const result = await service.execute({ buildingId, floor: 2 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0]!.unitNumber).toBe('201')
      }
    })

    it('should return empty array when floor has no units', async function () {
      const result = await service.execute({ buildingId, floor: 10 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })

    it('should return empty array when building does not exist', async function () {
      const result = await service.execute({
        buildingId: '550e8400-e29b-41d4-a716-446655440099',
        floor: 1,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
