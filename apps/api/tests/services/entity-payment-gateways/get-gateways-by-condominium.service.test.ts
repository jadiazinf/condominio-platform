import { describe, it, expect, beforeEach } from 'bun:test'
import type { TEntityPaymentGateway } from '@packages/domain'
import { GetGatewaysByCondominiumService } from '@src/services/entity-payment-gateways'

type TMockRepository = {
  getByCondominiumId: (condominiumId: string, includeInactive?: boolean) => Promise<TEntityPaymentGateway[]>
}

describe('GetGatewaysByCondominiumService', function () {
  let service: GetGatewaysByCondominiumService
  let mockRepository: TMockRepository

  const condominiumId = '550e8400-e29b-41d4-a716-446655440010'

  const mockGateways: TEntityPaymentGateway[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      paymentGatewayId: '550e8400-e29b-41d4-a716-446655440020',
      condominiumId,
      buildingId: null,
      entityConfiguration: { apiKey: 'test-key' },
      isActive: true,
      registeredBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      paymentGatewayId: '550e8400-e29b-41d4-a716-446655440021',
      condominiumId,
      buildingId: null,
      entityConfiguration: null,
      isActive: false,
      registeredBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByCondominiumId: async function (requestedCondominiumId: string, includeInactive?: boolean) {
        return mockGateways.filter(function (g) {
          const matchesCondominium = g.condominiumId === requestedCondominiumId
          const matchesActive = includeInactive || g.isActive
          return matchesCondominium && matchesActive
        })
      },
    }
    service = new GetGatewaysByCondominiumService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return active gateways for a condominium', async function () {
      const result = await service.execute({ condominiumId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every((g) => g.condominiumId === condominiumId && g.isActive)).toBe(true)
      }
    })

    it('should return all gateways including inactive when includeInactive is true', async function () {
      const result = await service.execute({ condominiumId, includeInactive: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((g) => g.condominiumId === condominiumId)).toBe(true)
      }
    })

    it('should return empty array when condominium has no gateways', async function () {
      const result = await service.execute({ condominiumId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
