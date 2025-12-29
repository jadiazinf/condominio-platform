import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type {
  TPaymentGateway,
  TPaymentGatewayCreate,
  TPaymentGatewayUpdate,
} from '@packages/domain'
import { PaymentGatewaysController } from '@http/controllers/payment-gateways'
import type { PaymentGatewaysRepository } from '@database/repositories'
import { PaymentGatewayFactory } from '../../setup/factories'
import { withId, createTestApp, type IApiResponse } from './test-utils'

// Mock repository type with custom methods
type TMockPaymentGatewaysRepository = {
  listAll: () => Promise<TPaymentGateway[]>
  getById: (id: string) => Promise<TPaymentGateway | null>
  create: (data: TPaymentGatewayCreate) => Promise<TPaymentGateway>
  update: (id: string, data: TPaymentGatewayUpdate) => Promise<TPaymentGateway | null>
  delete: (id: string) => Promise<boolean>
  getByName: (name: string) => Promise<TPaymentGateway | null>
  getByType: (gatewayType: string) => Promise<TPaymentGateway[]>
  getProductionGateways: () => Promise<TPaymentGateway[]>
}

describe('PaymentGatewaysController', function () {
  let app: Hono
  let request: (path: string, options?: RequestInit) => Promise<Response>
  let mockRepository: TMockPaymentGatewaysRepository
  let testGateways: TPaymentGateway[]

  beforeEach(function () {
    // Create test data using factory
    const stripe = PaymentGatewayFactory.stripe()
    const paypal = PaymentGatewayFactory.paypal()
    const production = PaymentGatewayFactory.production({
      name: 'Zelle Production',
      gatewayType: 'zelle',
    })

    testGateways = [
      withId(stripe, '550e8400-e29b-41d4-a716-446655440001') as TPaymentGateway,
      withId(paypal, '550e8400-e29b-41d4-a716-446655440002') as TPaymentGateway,
      withId(production, '550e8400-e29b-41d4-a716-446655440003') as TPaymentGateway,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testGateways
      },
      getById: async function (id: string) {
        return (
          testGateways.find(function (g) {
            return g.id === id
          }) || null
        )
      },
      create: async function (data: TPaymentGatewayCreate) {
        return withId(data, crypto.randomUUID()) as TPaymentGateway
      },
      update: async function (id: string, data: TPaymentGatewayUpdate) {
        const g = testGateways.find(function (item) {
          return item.id === id
        })
        if (!g) return null
        return { ...g, ...data } as TPaymentGateway
      },
      delete: async function (id: string) {
        return testGateways.some(function (g) {
          return g.id === id
        })
      },
      getByName: async function (name: string) {
        return (
          testGateways.find(function (g) {
            return g.name === name
          }) || null
        )
      },
      getByType: async function (gatewayType: string) {
        return testGateways.filter(function (g) {
          return g.gatewayType === gatewayType
        })
      },
      getProductionGateways: async function () {
        return testGateways.filter(function (g) {
          return !g.isSandbox
        })
      },
    }

    // Create controller with mock repository
    const controller = new PaymentGatewaysController(
      mockRepository as unknown as PaymentGatewaysRepository
    )

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/payment-gateways', controller.createRouter())

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all payment gateways', async function () {
      const res = await request('/payment-gateways')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no gateways exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/payment-gateways')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return gateway by ID', async function () {
      const res = await request('/payment-gateways/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Stripe')
      expect(json.data.gatewayType).toBe('stripe')
    })

    it('should return 404 when gateway not found', async function () {
      const res = await request('/payment-gateways/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/payment-gateways/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /name/:name (getByName)', function () {
    it('should return gateway by name', async function () {
      const res = await request('/payment-gateways/name/Stripe')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Stripe')
    })

    it('should return 404 when gateway with name not found', async function () {
      mockRepository.getByName = async function () {
        return null
      }

      const res = await request('/payment-gateways/name/Unknown')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Payment gateway not found')
    })
  })

  describe('GET /type/:gatewayType (getByType)', function () {
    it('should return gateways by type', async function () {
      const res = await request('/payment-gateways/type/stripe')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].gatewayType).toBe('stripe')
    })

    it('should return empty array when no gateways of type', async function () {
      mockRepository.getByType = async function () {
        return []
      }

      const res = await request('/payment-gateways/type/unknown')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /production (getProductionGateways)', function () {
    it('should return production gateways only', async function () {
      const res = await request('/payment-gateways/production')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].isSandbox).toBe(false)
    })

    it('should return empty array when no production gateways', async function () {
      mockRepository.getProductionGateways = async function () {
        return []
      }

      const res = await request('/payment-gateways/production')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new payment gateway', async function () {
      const newGateway = PaymentGatewayFactory.zelle()

      const res = await request('/payment-gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGateway),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Zelle')
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/payment-gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should return 409 when duplicate gateway exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newGateway = PaymentGatewayFactory.stripe()

      const res = await request('/payment-gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGateway),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource already exists')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing gateway', async function () {
      const res = await request('/payment-gateways/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.isActive).toBe(false)
    })

    it('should return 404 when updating non-existent gateway', async function () {
      const res = await request('/payment-gateways/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing gateway', async function () {
      const res = await request('/payment-gateways/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent gateway', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/payment-gateways/550e8400-e29b-41d4-a716-446655440099', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })
  })

  describe('Error handling', function () {
    it('should return 500 for unexpected errors', async function () {
      mockRepository.listAll = async function () {
        throw new Error('Unexpected database error')
      }

      const res = await request('/payment-gateways')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('An unexpected error occurred')
    })
  })
})
