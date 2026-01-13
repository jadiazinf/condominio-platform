import { describe, it, expect, beforeEach } from 'bun:test'
import type { TLocation } from '@packages/domain'
import { GetLocationsByParentService } from '@src/services/locations'

type TMockRepository = {
  getByParentId: (parentId: string) => Promise<TLocation[]>
}

describe('GetLocationsByParentService', function () {
  let service: GetLocationsByParentService
  let mockRepository: TMockRepository

  const countryId = '550e8400-e29b-41d4-a716-446655440001'

  const mockLocations: TLocation[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      name: 'Distrito Capital',
      locationType: 'province',
      parentId: countryId,
      code: 'DC',
      isActive: true,
      metadata: null,
      registeredBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440011',
      name: 'Miranda',
      locationType: 'province',
      parentId: countryId,
      code: 'MI',
      isActive: true,
      metadata: null,
      registeredBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByParentId: async function (parentId: string) {
        return mockLocations.filter(function (l) {
          return l.parentId === parentId
        })
      },
    }
    service = new GetLocationsByParentService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all child locations for a parent', async function () {
      const result = await service.execute({ parentId: countryId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(l => l.parentId === countryId)).toBe(true)
      }
    })

    it('should return empty array when parent has no children', async function () {
      const result = await service.execute({ parentId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
