import { describe, it, expect, beforeEach } from 'bun:test'
import type { TBuilding } from '@packages/domain'
import { GetBuildingByCondominiumAndCodeService } from '@src/services/buildings'

type TMockRepository = {
  getByCondominiumAndCode: (condominiumId: string, code: string) => Promise<TBuilding | null>
}

describe('GetBuildingByCondominiumAndCodeService', function () {
  let service: GetBuildingByCondominiumAndCodeService
  let mockRepository: TMockRepository

  const condominiumId = '550e8400-e29b-41d4-a716-446655440010'

  const mockBuilding: TBuilding = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    condominiumId,
    name: 'Building A',
    code: 'BLD-A',
    address: '123 Main Street',
    floorsCount: 10,
    unitsCount: 40,
    bankAccountHolder: 'Condominium A',
    bankName: 'Test Bank',
    bankAccountNumber: '1234567890',
    bankAccountType: 'Corriente',
    isActive: true,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(function () {
    mockRepository = {
      getByCondominiumAndCode: async function (requestedCondominiumId: string, code: string) {
        if (requestedCondominiumId === condominiumId && code === 'BLD-A') {
          return mockBuilding
        }
        return null
      },
    }
    service = new GetBuildingByCondominiumAndCodeService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return building when found by condominium and code', async function () {
      const result = await service.execute({ condominiumId, code: 'BLD-A' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.code).toBe('BLD-A')
        expect(result.data.condominiumId).toBe(condominiumId)
        expect(result.data.id).toBe(mockBuilding.id)
      }
    })

    it('should return NOT_FOUND error when building does not exist', async function () {
      const result = await service.execute({ condominiumId, code: 'NONEXISTENT' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Building not found')
      }
    })

    it('should return NOT_FOUND error when condominium does not match', async function () {
      const result = await service.execute({
        condominiumId: '550e8400-e29b-41d4-a716-446655440099',
        code: 'BLD-A',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Building not found')
      }
    })
  })
})
