import { describe, it, expect, beforeEach } from 'bun:test'
import type { TUnit } from '@packages/domain'
import { GetUnitByBuildingAndNumberService } from '@src/services/units'

type TMockRepository = {
  getByBuildingAndNumber: (buildingId: string, unitNumber: string) => Promise<TUnit | null>
}

describe('GetUnitByBuildingAndNumberService', function () {
  let service: GetUnitByBuildingAndNumberService
  let mockRepository: TMockRepository

  const buildingId = '550e8400-e29b-41d4-a716-446655440010'

  const mockUnit: TUnit = {
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
  }

  beforeEach(function () {
    mockRepository = {
      getByBuildingAndNumber: async function (reqBuildingId: string, unitNumber: string) {
        if (reqBuildingId === buildingId && unitNumber === '101') {
          return mockUnit
        }
        return null
      },
    }
    service = new GetUnitByBuildingAndNumberService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return unit when found', async function () {
      const result = await service.execute({ buildingId, unitNumber: '101' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.unitNumber).toBe('101')
        expect(result.data.buildingId).toBe(buildingId)
        expect(result.data.id).toBe(mockUnit.id)
      }
    })

    it('should return NOT_FOUND error when unit does not exist', async function () {
      const result = await service.execute({ buildingId, unitNumber: '999' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Unit not found')
      }
    })

    it('should return NOT_FOUND error when building does not have the unit', async function () {
      const result = await service.execute({
        buildingId: '550e8400-e29b-41d4-a716-446655440099',
        unitNumber: '101',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Unit not found')
      }
    })
  })
})
