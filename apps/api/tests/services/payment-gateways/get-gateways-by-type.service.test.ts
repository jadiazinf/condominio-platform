import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPaymentGateway, TGatewayType } from '@packages/domain'
import { GetGatewaysByTypeService } from '@src/services/payment-gateways'

type TMockRepository = {
  getByType: (gatewayType: TGatewayType, includeInactive?: boolean) => Promise<TPaymentGateway[]>
}

describe('GetGatewaysByTypeService', function () {
  let service: GetGatewaysByTypeService
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
      name: 'Stripe Sandbox',
      gatewayType: 'stripe',
      configuration: { apiKey: 'sk_test_xxx' },
      supportedCurrencies: ['550e8400-e29b-41d4-a716-446655440010'],
      isActive: true,
      isSandbox: true,
      metadata: null,
      registeredBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'Stripe Deprecated',
      gatewayType: 'stripe',
      configuration: null,
      supportedCurrencies: null,
      isActive: false,
      isSandbox: false,
      metadata: null,
      registeredBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440004',
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
      getByType: async function (gatewayType: TGatewayType, includeInactive?: boolean) {
        const filtered = mockGateways.filter(function (g) {
          return g.gatewayType === gatewayType
        })
        if (includeInactive) {
          return filtered
        }
        return filtered.filter(function (g) {
          return g.isActive
        })
      },
    }
    service = new GetGatewaysByTypeService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return only active gateways of given type by default', async function () {
      const result = await service.execute({ gatewayType: 'stripe' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((g) => g.gatewayType === 'stripe')).toBe(true)
        expect(result.data.every((g) => g.isActive)).toBe(true)
      }
    })

    it('should return all gateways of given type when includeInactive is true', async function () {
      const result = await service.execute({ gatewayType: 'stripe', includeInactive: true })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(3)
        expect(result.data.every((g) => g.gatewayType === 'stripe')).toBe(true)
      }
    })

    it('should return gateways by different type', async function () {
      const result = await service.execute({ gatewayType: 'paypal' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0]?.gatewayType).toBe('paypal')
        expect(result.data[0]?.name).toBe('PayPal Production')
      }
    })

    it('should return empty array when no gateways of type exist', async function () {
      const result = await service.execute({ gatewayType: 'zelle' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
