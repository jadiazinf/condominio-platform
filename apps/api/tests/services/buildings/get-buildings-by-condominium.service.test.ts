import { describe, it, expect, beforeEach } from 'bun:test'
import type { TBuilding } from '@packages/domain'
import { GetBuildingsByCondominiumService } from '@src/services/buildings'

type TMockRepository = {
  getByCondominiumId: (condominiumId: string) => Promise<TBuilding[]>
}

describe('GetBuildingsByCondominiumService', function () {
  let service: GetBuildingsByCondominiumService
  let mockRepository: TMockRepository

  const condominiumId = '550e8400-e29b-41d4-a716-446655440010'

  const mockBuildings: TBuilding[] = [
    {
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
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      condominiumId,
      name: 'Building B',
      code: 'BLD-B',
      address: '456 Main Street',
      floorsCount: 8,
      unitsCount: 32,
      bankAccountHolder: null,
      bankName: null,
      bankAccountNumber: null,
      bankAccountType: null,
      isActive: true,
      metadata: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByCondominiumId: async function (requestedCondominiumId: string) {
        return mockBuildings.filter(function (b) {
          return b.condominiumId === requestedCondominiumId
        })
      },
    }
    service = new GetBuildingsByCondominiumService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all buildings for a condominium', async function () {
      const result = await service.execute({ condominiumId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((b) => b.condominiumId === condominiumId)).toBe(true)
      }
    })

    it('should return empty array when condominium has no buildings', async function () {
      const result = await service.execute({ condominiumId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
