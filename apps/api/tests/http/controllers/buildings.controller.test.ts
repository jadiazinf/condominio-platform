import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TBuilding, TBuildingCreate, TBuildingUpdate } from '@packages/domain'
import { BuildingsController } from '@http/controllers/buildings'
import type { BuildingsRepository } from '@database/repositories'
import { BuildingFactory } from '../../setup/factories'
import { withId, createTestApp, getErrorMessage, type IApiResponse, type IStandardErrorResponse } from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockBuildingsRepository = {
  listAll: () => Promise<TBuilding[]>
  getById: (id: string) => Promise<TBuilding | null>
  create: (data: TBuildingCreate) => Promise<TBuilding>
  update: (id: string, data: TBuildingUpdate) => Promise<TBuilding | null>
  delete: (id: string) => Promise<boolean>
  getByCondominiumId: (condominiumId: string) => Promise<TBuilding[]>
  getByCondominiumAndCode: (condominiumId: string, code: string) => Promise<TBuilding | null>
}

describe('BuildingsController', function () {
  let app: Hono
  let mockRepository: TMockBuildingsRepository
  let testBuildings: TBuilding[]
  let request: (path: string, options?: RequestInit) => Promise<Response>

  beforeEach(async function () {
    // Create test data
    const condominiumId = '550e8400-e29b-41d4-a716-446655440010'
    const building1 = BuildingFactory.create(condominiumId, {
      name: 'Torre A',
      code: 'A',
    })
    const building2 = BuildingFactory.create(condominiumId, {
      name: 'Torre B',
      code: 'B',
    })

    testBuildings = [
      withId(building1, '550e8400-e29b-41d4-a716-446655440001') as TBuilding,
      withId(building2, '550e8400-e29b-41d4-a716-446655440002') as TBuilding,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testBuildings
      },
      getById: async function (id: string) {
        return (
          testBuildings.find(function (b) {
            return b.id === id
          }) || null
        )
      },
      create: async function (data: TBuildingCreate) {
        return withId(data, crypto.randomUUID()) as TBuilding
      },
      update: async function (id: string, data: TBuildingUpdate) {
        const building = testBuildings.find(function (b) {
          return b.id === id
        })
        if (!building) return null
        return { ...building, ...data } as TBuilding
      },
      delete: async function (id: string) {
        return testBuildings.some(function (b) {
          return b.id === id
        })
      },
      getByCondominiumId: async function (condominiumId: string) {
        return testBuildings.filter(function (b) {
          return b.condominiumId === condominiumId
        })
      },
      getByCondominiumAndCode: async function (condominiumId: string, code: string) {
        return (
          testBuildings.find(function (b) {
            return b.condominiumId === condominiumId && b.code === code
          }) || null
        )
      },
    }

    // Create controller with mock repository
    const controller = new BuildingsController(mockRepository as unknown as BuildingsRepository)

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/buildings', controller.createRouter())

    // Get auth token

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all buildings', async function () {
      const res = await request('/buildings')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
    })

    it('should return empty array when no buildings exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/buildings')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return building by ID', async function () {
      const res = await request('/buildings/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Torre A')
    })

    it('should return 404 when building not found', async function () {
      const res = await request('/buildings/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/buildings/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /condominium/:condominiumId (getByCondominiumId)', function () {
    it('should return buildings by condominium ID', async function () {
      const res = await request('/buildings/condominium/550e8400-e29b-41d4-a716-446655440010')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
    })

    it('should return empty array when no buildings for condominium', async function () {
      mockRepository.getByCondominiumId = async function () {
        return []
      }

      const res = await request('/buildings/condominium/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })

    it('should return 400 for invalid condominium UUID format', async function () {
      const res = await request('/buildings/condominium/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /condominium/:condominiumId/code/:code (getByCondominiumAndCode)', function () {
    it('should return building by condominium ID and code', async function () {
      const res = await request(
        '/buildings/condominium/550e8400-e29b-41d4-a716-446655440010/code/A'
      )
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Torre A')
      expect(json.data.code).toBe('A')
    })

    it('should return 404 when building with code not found', async function () {
      const res = await request(
        '/buildings/condominium/550e8400-e29b-41d4-a716-446655440010/code/Z'
      )
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toBe('Building not found')
    })

    it('should return 400 for invalid condominium UUID format', async function () {
      const res = await request('/buildings/condominium/invalid-id/code/A')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new building', async function () {
      const newBuilding = BuildingFactory.create('550e8400-e29b-41d4-a716-446655440010', {
        name: 'Torre C',
        code: 'C',
      })

      const res = await request('/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBuilding),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Torre C')
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)

      const json = (await res.json()) as IStandardErrorResponse
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ErrorCodes.VALIDATION_ERROR)
      expect(json.error.message).toBeDefined()
      expect(json.error.fields).toBeDefined()
      expect(Array.isArray(json.error.fields)).toBe(true)
    })

    it('should return 409 when duplicate building exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newBuilding = BuildingFactory.create('550e8400-e29b-41d4-a716-446655440010', {
        code: 'A',
      })

      const res = await request('/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBuilding),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('already exists')
    })

    it('should return 400 for foreign key violations', async function () {
      mockRepository.create = async function () {
        throw new Error('violates foreign key constraint')
      }

      const newBuilding = BuildingFactory.create('550e8400-e29b-41d4-a716-446655440099')

      const res = await request('/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBuilding),
      })

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('reference')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing building', async function () {
      const res = await request('/buildings/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Torre A Renovada' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Torre A Renovada')
    })

    it('should return 404 when updating non-existent building', async function () {
      const res = await request('/buildings/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing building', async function () {
      const res = await request('/buildings/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent building', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/buildings/550e8400-e29b-41d4-a716-446655440099', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('Error handling', function () {
    it('should return 500 for unexpected errors', async function () {
      mockRepository.listAll = async function () {
        throw new Error('Unexpected database error')
      }

      const res = await request('/buildings')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('unexpected')
    })
  })
})
