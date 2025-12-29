import { describe, it, expect, beforeEach } from 'bun:test'
import type { TLocation, TLocationType } from '@packages/domain'
import { GetLocationsByTypeService } from '@src/services/locations'

type TMockRepository = {
  getByType: (locationType: TLocationType, includeInactive?: boolean) => Promise<TLocation[]>
}

describe('GetLocationsByTypeService', function () {
  let service: GetLocationsByTypeService
  let mockRepository: TMockRepository

  const mockLocations: TLocation[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Venezuela',
      locationType: 'country',
      parentId: null,
      code: 'VE',
      isActive: true,
      metadata: null,
      registeredBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Colombia',
      locationType: 'country',
      parentId: null,
      code: 'CO',
      isActive: true,
      metadata: null,
      registeredBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'Old Country',
      locationType: 'country',
      parentId: null,
      code: 'OC',
      isActive: false,
      metadata: null,
      registeredBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      name: 'Caracas',
      locationType: 'city',
      parentId: '550e8400-e29b-41d4-a716-446655440001',
      code: 'CCS',
      isActive: true,
      metadata: null,
      registeredBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByType: async function (locationType: TLocationType, includeInactive?: boolean) {
        const filtered = mockLocations.filter(function (l) {
          return l.locationType === locationType
        })
        if (includeInactive) {
          return filtered
        }
        return filtered.filter(function (l) {
          return l.isActive
        })
      },
    }
    service = new GetLocationsByTypeService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return only active locations of given type by default', async function () {
      const result = await service.execute({ locationType: 'country' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((l) => l.locationType === 'country')).toBe(true)
        expect(result.data.every((l) => l.isActive)).toBe(true)
      }
    })

    it('should return all locations of given type when includeInactive is true', async function () {
      const result = await service.execute({ locationType: 'country', includeInactive: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(3)
        expect(result.data.every((l) => l.locationType === 'country')).toBe(true)
      }
    })

    it('should return locations by different type', async function () {
      const result = await service.execute({ locationType: 'city' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0]?.locationType).toBe('city')
        expect(result.data[0]?.name).toBe('Caracas')
      }
    })

    it('should return empty array when no locations of type exist', async function () {
      const result = await service.execute({ locationType: 'province' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
