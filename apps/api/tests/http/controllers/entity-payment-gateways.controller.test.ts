import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type {
  TEntityPaymentGateway,
  TEntityPaymentGatewayCreate,
  TEntityPaymentGatewayUpdate,
} from '@packages/domain'
import { EntityPaymentGatewaysController } from '@http/controllers/entity-payment-gateways'
import type { EntityPaymentGatewaysRepository } from '@database/repositories'
import { withId, createTestApp, type IApiResponse } from './test-utils'

// Mock repository type with custom methods
type TMockEntityPaymentGatewaysRepository = {
  listAll: () => Promise<TEntityPaymentGateway[]>
  getById: (id: string) => Promise<TEntityPaymentGateway | null>
  create: (data: TEntityPaymentGatewayCreate) => Promise<TEntityPaymentGateway>
  update: (id: string, data: TEntityPaymentGatewayUpdate) => Promise<TEntityPaymentGateway | null>
  delete: (id: string) => Promise<boolean>
  getByCondominiumId: (condominiumId: string) => Promise<TEntityPaymentGateway[]>
  getByBuildingId: (buildingId: string) => Promise<TEntityPaymentGateway[]>
  getByPaymentGatewayId: (paymentGatewayId: string) => Promise<TEntityPaymentGateway[]>
}

function createEntityPaymentGateway(
  paymentGatewayId: string,
  overrides: Partial<TEntityPaymentGatewayCreate> = {}
): TEntityPaymentGatewayCreate {
  return {
    paymentGatewayId,
    condominiumId: null,
    buildingId: null,
    entityConfiguration: null,
    isActive: true,
    registeredBy: null,
    ...overrides,
  }
}

describe('EntityPaymentGatewaysController', function () {
  let app: Hono
  let mockRepository: TMockEntityPaymentGatewaysRepository
  let testEntityGateways: TEntityPaymentGateway[]

  const condominiumId = '550e8400-e29b-41d4-a716-446655440010'
  const buildingId = '550e8400-e29b-41d4-a716-446655440011'
  const paymentGatewayId1 = '550e8400-e29b-41d4-a716-446655440020'
  const paymentGatewayId2 = '550e8400-e29b-41d4-a716-446655440021'

  beforeEach(function () {
    // Create test data
    const epg1 = createEntityPaymentGateway(paymentGatewayId1, { condominiumId })
    const epg2 = createEntityPaymentGateway(paymentGatewayId2, { buildingId })
    const epg3 = createEntityPaymentGateway(paymentGatewayId1, { condominiumId, isActive: false })

    testEntityGateways = [
      withId(epg1, '550e8400-e29b-41d4-a716-446655440001') as TEntityPaymentGateway,
      withId(epg2, '550e8400-e29b-41d4-a716-446655440002') as TEntityPaymentGateway,
      withId(epg3, '550e8400-e29b-41d4-a716-446655440003') as TEntityPaymentGateway,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testEntityGateways
      },
      getById: async function (id: string) {
        return (
          testEntityGateways.find(function (epg) {
            return epg.id === id
          }) || null
        )
      },
      create: async function (data: TEntityPaymentGatewayCreate) {
        return withId(data, crypto.randomUUID()) as TEntityPaymentGateway
      },
      update: async function (id: string, data: TEntityPaymentGatewayUpdate) {
        const epg = testEntityGateways.find(function (item) {
          return item.id === id
        })
        if (!epg) return null
        return { ...epg, ...data } as TEntityPaymentGateway
      },
      delete: async function (id: string) {
        return testEntityGateways.some(function (epg) {
          return epg.id === id
        })
      },
      getByCondominiumId: async function (condominiumId: string) {
        return testEntityGateways.filter(function (epg) {
          return epg.condominiumId === condominiumId
        })
      },
      getByBuildingId: async function (buildingId: string) {
        return testEntityGateways.filter(function (epg) {
          return epg.buildingId === buildingId
        })
      },
      getByPaymentGatewayId: async function (paymentGatewayId: string) {
        return testEntityGateways.filter(function (epg) {
          return epg.paymentGatewayId === paymentGatewayId
        })
      },
    }

    // Create controller with mock repository
    const controller = new EntityPaymentGatewaysController(
      mockRepository as unknown as EntityPaymentGatewaysRepository
    )

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/entity-payment-gateways', controller.createRouter())
  })

  describe('GET / (list)', function () {
    it('should return all entity payment gateways', async function () {
      const res = await app.request('/entity-payment-gateways')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no gateways exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await app.request('/entity-payment-gateways')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return entity payment gateway by ID', async function () {
      const res = await app.request('/entity-payment-gateways/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.paymentGatewayId).toBe(paymentGatewayId1)
      expect(json.data.condominiumId).toBe(condominiumId)
    })

    it('should return 404 when gateway not found', async function () {
      const res = await app.request('/entity-payment-gateways/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await app.request('/entity-payment-gateways/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /condominium/:condominiumId (getByCondominiumId)', function () {
    it('should return gateways by condominium ID', async function () {
      const res = await app.request(`/entity-payment-gateways/condominium/${condominiumId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (epg: TEntityPaymentGateway) {
          return epg.condominiumId === condominiumId
        })
      ).toBe(true)
    })

    it('should return empty array when no gateways for condominium', async function () {
      mockRepository.getByCondominiumId = async function () {
        return []
      }

      const res = await app.request(
        '/entity-payment-gateways/condominium/550e8400-e29b-41d4-a716-446655440099'
      )
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /building/:buildingId (getByBuildingId)', function () {
    it('should return gateways by building ID', async function () {
      const res = await app.request(`/entity-payment-gateways/building/${buildingId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].buildingId).toBe(buildingId)
    })

    it('should return empty array when no gateways for building', async function () {
      mockRepository.getByBuildingId = async function () {
        return []
      }

      const res = await app.request(
        '/entity-payment-gateways/building/550e8400-e29b-41d4-a716-446655440099'
      )
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /gateway/:paymentGatewayId (getByPaymentGatewayId)', function () {
    it('should return entities by payment gateway ID', async function () {
      const res = await app.request(`/entity-payment-gateways/gateway/${paymentGatewayId1}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (epg: TEntityPaymentGateway) {
          return epg.paymentGatewayId === paymentGatewayId1
        })
      ).toBe(true)
    })

    it('should return empty array when no entities for gateway', async function () {
      mockRepository.getByPaymentGatewayId = async function () {
        return []
      }

      const res = await app.request(
        '/entity-payment-gateways/gateway/550e8400-e29b-41d4-a716-446655440099'
      )
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new entity payment gateway', async function () {
      const newGateway = createEntityPaymentGateway(paymentGatewayId2, { condominiumId })

      const res = await app.request('/entity-payment-gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGateway),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.paymentGatewayId).toBe(paymentGatewayId2)
      expect(json.data.condominiumId).toBe(condominiumId)
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await app.request('/entity-payment-gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentGatewayId: 'invalid' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should return 409 when duplicate gateway exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newGateway = createEntityPaymentGateway(paymentGatewayId1, { condominiumId })

      const res = await app.request('/entity-payment-gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGateway),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource already exists')
    })

    it('should return 400 for foreign key violations', async function () {
      mockRepository.create = async function () {
        throw new Error('violates foreign key constraint')
      }

      const newGateway = createEntityPaymentGateway('550e8400-e29b-41d4-a716-446655440099')

      const res = await app.request('/entity-payment-gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGateway),
      })

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Invalid reference to related resource')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing entity payment gateway', async function () {
      const res = await app.request(
        '/entity-payment-gateways/550e8400-e29b-41d4-a716-446655440001',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: false }),
        }
      )

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.isActive).toBe(false)
    })

    it('should return 404 when updating non-existent gateway', async function () {
      const res = await app.request(
        '/entity-payment-gateways/550e8400-e29b-41d4-a716-446655440099',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: false }),
        }
      )

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing entity payment gateway', async function () {
      const res = await app.request(
        '/entity-payment-gateways/550e8400-e29b-41d4-a716-446655440001',
        {
          method: 'DELETE',
        }
      )

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent gateway', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await app.request(
        '/entity-payment-gateways/550e8400-e29b-41d4-a716-446655440099',
        {
          method: 'DELETE',
        }
      )

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

      const res = await app.request('/entity-payment-gateways')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('An unexpected error occurred')
    })
  })
})
