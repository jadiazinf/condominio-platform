import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPaymentGateway } from '@packages/domain'
import { GetProductionGatewaysService } from '@src/services/payment-gateways'

type TMockRepository = {
  getProductionGateways: () => Promise<TPaymentGateway[]>
}

describe('GetProductionGatewaysService', function () {
  let service: GetProductionGatewaysService
  let mockRepository: TMockRepository

  const mockGateways: TPaymentGateway[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Stripe Production',
      gatewayType: 'stripe',
      configuration: { apiKey: 'sk_live_xxx' },
      supportedCurrencies: ['550e8400-e29b-41d4-a716-446655440010'],
      isActive: true,
      isSandbox: false,
      metadata: null,
      registeredBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'PayPal Production',
      gatewayType: 'paypal',
      configuration: { clientId: 'xxx' },
      supportedCurrencies: ['550e8400-e29b-41d4-a716-446655440010'],
      isActive: true,
      isSandbox: false,
      metadata: null,
      registeredBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getProductionGateways: async function () {
        return mockGateways
      },
    }
    service = new GetProductionGatewaysService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all production gateways', async function () {
      const result = await service.execute()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(g => g.isSandbox === false)).toBe(true)
        expect(result.data.every(g => g.isActive === true)).toBe(true)
      }
    })

    it('should return empty array when no production gateways exist', async function () {
      mockRepository.getProductionGateways = async function () {
        return []
      }

      const result = await service.execute()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
