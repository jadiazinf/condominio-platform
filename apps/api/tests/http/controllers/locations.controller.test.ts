import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TLocation, TLocationCreate, TLocationUpdate, TLocationType } from '@packages/domain'
import { LocationsController } from '@http/controllers/locations'
import type { LocationsRepository } from '@database/repositories'
import { LocationFactory } from '../../setup/factories'
import { withId, createTestApp, type IApiResponse } from './test-utils'

// Mock repository type with custom methods
type TMockLocationsRepository = {
  listAll: () => Promise<TLocation[]>
  getById: (id: string) => Promise<TLocation | null>
  create: (data: TLocationCreate) => Promise<TLocation>
  update: (id: string, data: TLocationUpdate) => Promise<TLocation | null>
  delete: (id: string) => Promise<boolean>
  getByType: (type: TLocationType) => Promise<TLocation[]>
  getByParentId: (parentId: string) => Promise<TLocation[]>
}

describe('LocationsController', function () {
  let app: Hono
  let mockRepository: TMockLocationsRepository
  let testLocations: TLocation[]

  beforeEach(function () {
    // Create test data
    const countryData = LocationFactory.country({ name: 'Venezuela' })
    const provinceData = LocationFactory.province('550e8400-e29b-41d4-a716-446655440001', {
      name: 'Distrito Capital',
    })
    const cityData = LocationFactory.city('550e8400-e29b-41d4-a716-446655440002', {
      name: 'Caracas',
    })

    testLocations = [
      withId(countryData, '550e8400-e29b-41d4-a716-446655440001') as TLocation,
      withId(provinceData, '550e8400-e29b-41d4-a716-446655440002') as TLocation,
      withId(cityData, '550e8400-e29b-41d4-a716-446655440003') as TLocation,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testLocations
      },
      getById: async function (id: string) {
        return (
          testLocations.find(function (l) {
            return l.id === id
          }) || null
        )
      },
      create: async function (data: TLocationCreate) {
        return withId(data, crypto.randomUUID()) as TLocation
      },
      update: async function (id: string, data: TLocationUpdate) {
        const location = testLocations.find(function (l) {
          return l.id === id
        })
        if (!location) return null
        return { ...location, ...data } as TLocation
      },
      delete: async function (id: string) {
        return testLocations.some(function (l) {
          return l.id === id
        })
      },
      getByType: async function (type: TLocationType) {
        return testLocations.filter(function (l) {
          return l.locationType === type
        })
      },
      getByParentId: async function (parentId: string) {
        return testLocations.filter(function (l) {
          return l.parentId === parentId
        })
      },
    }

    // Create controller with mock repository
    const controller = new LocationsController(mockRepository as unknown as LocationsRepository)

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/locations', controller.createRouter())
  })

  describe('GET / (list)', function () {
    it('should return all locations', async function () {
      const res = await app.request('/locations')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no locations exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await app.request('/locations')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return location by ID', async function () {
      const res = await app.request('/locations/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Venezuela')
    })

    it('should return 404 when location not found', async function () {
      const res = await app.request('/locations/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await app.request('/locations/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /type/:type (getByType)', function () {
    it('should return locations by type - country', async function () {
      const res = await app.request('/locations/type/country')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].name).toBe('Venezuela')
    })

    it('should return locations by type - province', async function () {
      const res = await app.request('/locations/type/province')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].name).toBe('Distrito Capital')
    })

    it('should return locations by type - city', async function () {
      const res = await app.request('/locations/type/city')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].name).toBe('Caracas')
    })

    it('should return empty array when no locations of type exist', async function () {
      mockRepository.getByType = async function () {
        return []
      }

      const res = await app.request('/locations/type/country')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })

    it('should return 400 for invalid location type', async function () {
      const res = await app.request('/locations/type/invalid-type')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /parent/:parentId (getByParentId)', function () {
    it('should return locations by parent ID', async function () {
      const res = await app.request('/locations/parent/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].name).toBe('Distrito Capital')
    })

    it('should return empty array when no children exist', async function () {
      mockRepository.getByParentId = async function () {
        return []
      }

      const res = await app.request('/locations/parent/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })

    it('should return 400 for invalid parent UUID format', async function () {
      const res = await app.request('/locations/parent/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new location', async function () {
      const newLocation = LocationFactory.country({ name: 'Colombia' })

      const res = await app.request('/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLocation),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Colombia')
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await app.request('/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should return 409 when duplicate location exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newLocation = LocationFactory.country({ name: 'Venezuela' })

      const res = await app.request('/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLocation),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource already exists')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing location', async function () {
      const res = await app.request('/locations/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'República Bolivariana de Venezuela' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('República Bolivariana de Venezuela')
    })

    it('should return 404 when updating non-existent location', async function () {
      const res = await app.request('/locations/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing location', async function () {
      const res = await app.request('/locations/550e8400-e29b-41d4-a716-446655440003', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent location', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await app.request('/locations/550e8400-e29b-41d4-a716-446655440099', {
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

      const res = await app.request('/locations')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('An unexpected error occurred')
    })
  })
})
