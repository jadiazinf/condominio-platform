import { describe, it, expect, beforeEach } from 'bun:test'
import type { TEntityPaymentGateway } from '@packages/domain'
import { GetGatewaysByBuildingService } from '@src/services/entity-payment-gateways'

type TMockRepository = {
  getByBuildingId: (buildingId: string, includeInactive?: boolean) => Promise<TEntityPaymentGateway[]>
}

describe('GetGatewaysByBuildingService', function () {
  let service: GetGatewaysByBuildingService
  let mockRepository: TMockRepository

  const buildingId = '550e8400-e29b-41d4-a716-446655440010'

  const mockGateways: TEntityPaymentGateway[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      paymentGatewayId: '550e8400-e29b-41d4-a716-446655440020',
      condominiumId: '550e8400-e29b-41d4-a716-446655440005',
      buildingId,
      entityConfiguration: { apiKey: 'building-key' },
      isActive: true,
      registeredBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      paymentGatewayId: '550e8400-e29b-41d4-a716-446655440021',
      condominiumId: '550e8400-e29b-41d4-a716-446655440005',
      buildingId,
      entityConfiguration: null,
      isActive: false,
      registeredBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByBuildingId: async function (requestedBuildingId: string, includeInactive?: boolean) {
        return mockGateways.filter(function (g) {
          const matchesBuilding = g.buildingId === requestedBuildingId
          const matchesActive = includeInactive || g.isActive
          return matchesBuilding && matchesActive
        })
      },
    }
    service = new GetGatewaysByBuildingService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return active gateways for a building', async function () {
      const result = await service.execute({ buildingId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every((g) => g.buildingId === buildingId && g.isActive)).toBe(true)
      }
    })

    it('should return all gateways including inactive when includeInactive is true', async function () {
      const result = await service.execute({ buildingId, includeInactive: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((g) => g.buildingId === buildingId)).toBe(true)
      }
    })

    it('should return empty array when building has no gateways', async function () {
      const result = await service.execute({ buildingId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
