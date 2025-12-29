import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPaymentGateway } from '@packages/domain'
import { GetGatewayByNameService } from '@src/services/payment-gateways'

type TMockRepository = {
  getByName: (name: string) => Promise<TPaymentGateway | null>
}

describe('GetGatewayByNameService', function () {
  let service: GetGatewayByNameService
  let mockRepository: TMockRepository

  const mockGateway: TPaymentGateway = {
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
  }

  beforeEach(function () {
    mockRepository = {
      getByName: async function (name: string) {
        if (name === 'Stripe Production') {
          return mockGateway
        }
        return null
      },
    }
    service = new GetGatewayByNameService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return gateway when found', async function () {
      const result = await service.execute({ name: 'Stripe Production' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(mockGateway.id)
        expect(result.data.name).toBe('Stripe Production')
        expect(result.data.gatewayType).toBe('stripe')
      }
    })

    it('should return NOT_FOUND error when gateway does not exist', async function () {
      const result = await service.execute({ name: 'Unknown Gateway' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Payment gateway not found')
      }
    })
  })
})
