import { describe, it, expect, beforeEach } from 'bun:test'
import type { TEntityPaymentGateway } from '@packages/domain'
import { GetGatewaysByPaymentGatewayService } from '@src/services/entity-payment-gateways'

type TMockRepository = {
  getByPaymentGatewayId: (
    paymentGatewayId: string,
    includeInactive?: boolean
  ) => Promise<TEntityPaymentGateway[]>
}

describe('GetGatewaysByPaymentGatewayService', function () {
  let service: GetGatewaysByPaymentGatewayService
  let mockRepository: TMockRepository

  const paymentGatewayId = '550e8400-e29b-41d4-a716-446655440020'

  const mockGateways: TEntityPaymentGateway[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      paymentGatewayId,
      condominiumId: '550e8400-e29b-41d4-a716-446655440005',
      buildingId: null,
      entityConfiguration: { apiKey: 'condo-key' },
      isActive: true,
      registeredBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      paymentGatewayId,
      condominiumId: '550e8400-e29b-41d4-a716-446655440006',
      buildingId: null,
      entityConfiguration: { apiKey: 'condo-key-2' },
      isActive: false,
      registeredBy: '550e8400-e29b-41d4-a716-446655440030',
      createdAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByPaymentGatewayId: async function (
        requestedPaymentGatewayId: string,
        includeInactive?: boolean
      ) {
        return mockGateways.filter(function (g) {
          const matchesPaymentGateway = g.paymentGatewayId === requestedPaymentGatewayId
          const matchesActive = includeInactive || g.isActive
          return matchesPaymentGateway && matchesActive
        })
      },
    }
    service = new GetGatewaysByPaymentGatewayService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return active entity gateways for a payment gateway', async function () {
      const result = await service.execute({ paymentGatewayId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every(g => g.paymentGatewayId === paymentGatewayId && g.isActive)).toBe(
          true
        )
      }
    })

    it('should return all entity gateways including inactive when includeInactive is true', async function () {
      const result = await service.execute({ paymentGatewayId, includeInactive: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(g => g.paymentGatewayId === paymentGatewayId)).toBe(true)
      }
    })

    it('should return empty array when payment gateway has no entity gateways', async function () {
      const result = await service.execute({
        paymentGatewayId: '550e8400-e29b-41d4-a716-446655440099',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
