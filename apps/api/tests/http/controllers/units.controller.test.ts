import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TUnit, TUnitCreate, TUnitUpdate } from '@packages/domain'
import { UnitsController } from '@http/controllers/units'
import type { UnitsRepository } from '@database/repositories'
import { UnitFactory } from '../../setup/factories'
import {
  withId,
  createTestApp,
  getErrorMessage,
  type IApiResponse,
  type IStandardErrorResponse,
} from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockUnitsRepository = {
  listAll: () => Promise<TUnit[]>
  getById: (id: string) => Promise<TUnit | null>
  create: (data: TUnitCreate) => Promise<TUnit>
  update: (id: string, data: TUnitUpdate) => Promise<TUnit | null>
  delete: (id: string) => Promise<boolean>
  getByBuildingId: (buildingId: string) => Promise<TUnit[]>
  getByBuildingAndNumber: (buildingId: string, unitNumber: string) => Promise<TUnit | null>
  getByFloor: (buildingId: string, floor: number) => Promise<TUnit[]>
}

describe('UnitsController', function () {
  let app: Hono
  let mockRepository: TMockUnitsRepository
  let testUnits: TUnit[]
  let request: (path: string, options?: RequestInit) => Promise<Response>

  beforeEach(async function () {
    // Create test data
    const buildingId = '550e8400-e29b-41d4-a716-446655440010'
    const unit1 = UnitFactory.create(buildingId, {
      unitNumber: '101',
      floor: 1,
    })
    const unit2 = UnitFactory.create(buildingId, {
      unitNumber: '102',
      floor: 1,
    })
    const unit3 = UnitFactory.create(buildingId, {
      unitNumber: '201',
      floor: 2,
    })

    testUnits = [
      withId(unit1, '550e8400-e29b-41d4-a716-446655440001') as TUnit,
      withId(unit2, '550e8400-e29b-41d4-a716-446655440002') as TUnit,
      withId(unit3, '550e8400-e29b-41d4-a716-446655440003') as TUnit,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testUnits
      },
      getById: async function (id: string) {
        return (
          testUnits.find(function (u) {
            return u.id === id
          }) || null
        )
      },
      create: async function (data: TUnitCreate) {
        return withId(data, crypto.randomUUID()) as TUnit
      },
      update: async function (id: string, data: TUnitUpdate) {
        const unit = testUnits.find(function (u) {
          return u.id === id
        })
        if (!unit) return null
        return { ...unit, ...data } as TUnit
      },
      delete: async function (id: string) {
        return testUnits.some(function (u) {
          return u.id === id
        })
      },
      getByBuildingId: async function (buildingId: string) {
        return testUnits.filter(function (u) {
          return u.buildingId === buildingId
        })
      },
      getByBuildingAndNumber: async function (buildingId: string, unitNumber: string) {
        return (
          testUnits.find(function (u) {
            return u.buildingId === buildingId && u.unitNumber === unitNumber
          }) || null
        )
      },
      getByFloor: async function (buildingId: string, floor: number) {
        return testUnits.filter(function (u) {
          return u.buildingId === buildingId && u.floor === floor
        })
      },
    }

    // Create controller with mock repository
    const controller = new UnitsController(mockRepository as unknown as UnitsRepository)

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/units', controller.createRouter())

    // Get auth token

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all units', async function () {
      const res = await request('/units')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no units exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/units')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return unit by ID', async function () {
      const res = await request('/units/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.unitNumber).toBe('101')
    })

    it('should return 404 when unit not found', async function () {
      const res = await request('/units/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/units/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /building/:buildingId (getByBuildingId)', function () {
    it('should return units by building ID', async function () {
      const res = await request('/units/building/550e8400-e29b-41d4-a716-446655440010')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no units for building', async function () {
      mockRepository.getByBuildingId = async function () {
        return []
      }

      const res = await request('/units/building/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })

    it('should return 400 for invalid building UUID format', async function () {
      const res = await request('/units/building/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /building/:buildingId/number/:unitNumber (getByBuildingAndNumber)', function () {
    it('should return unit by building ID and unit number', async function () {
      const res = await request('/units/building/550e8400-e29b-41d4-a716-446655440010/number/101')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.unitNumber).toBe('101')
      expect(json.data.floor).toBe(1)
    })

    it('should return 404 when unit with number not found', async function () {
      const res = await request('/units/building/550e8400-e29b-41d4-a716-446655440010/number/999')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toBe('Unit not found')
    })

    it('should return 400 for invalid building UUID format', async function () {
      const res = await request('/units/building/invalid-id/number/101')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /building/:buildingId/floor/:floor (getByFloor)', function () {
    it('should return units by building ID and floor', async function () {
      const res = await request('/units/building/550e8400-e29b-41d4-a716-446655440010/floor/1')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (u: TUnit) {
          return u.floor === 1
        })
      ).toBe(true)
    })

    it('should return units on floor 2', async function () {
      const res = await request('/units/building/550e8400-e29b-41d4-a716-446655440010/floor/2')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].unitNumber).toBe('201')
    })

    it('should return empty array when no units on floor', async function () {
      mockRepository.getByFloor = async function () {
        return []
      }

      const res = await request('/units/building/550e8400-e29b-41d4-a716-446655440010/floor/99')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })

    it('should return 400 for invalid building UUID format', async function () {
      const res = await request('/units/building/invalid-id/floor/1')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new unit', async function () {
      const newUnit = UnitFactory.create('550e8400-e29b-41d4-a716-446655440010', {
        unitNumber: '301',
        floor: 3,
      })

      const res = await request('/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUnit),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.unitNumber).toBe('301')
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitNumber: '' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)

      const json = (await res.json()) as IStandardErrorResponse
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ErrorCodes.VALIDATION_ERROR)
      expect(json.error.message).toBeDefined()
      expect(json.error.fields).toBeDefined()
      expect(Array.isArray(json.error.fields)).toBe(true)
    })

    it('should return 409 when duplicate unit exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newUnit = UnitFactory.create('550e8400-e29b-41d4-a716-446655440010', {
        unitNumber: '101',
      })

      const res = await request('/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUnit),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('already exists')
    })

    it('should return 400 for foreign key violations', async function () {
      mockRepository.create = async function () {
        throw new Error('violates foreign key constraint')
      }

      const newUnit = UnitFactory.create('550e8400-e29b-41d4-a716-446655440099')

      const res = await request('/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUnit),
      })

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('reference')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing unit', async function () {
      const res = await request('/units/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bedrooms: 3 }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.bedrooms).toBe(3)
    })

    it('should return 404 when updating non-existent unit', async function () {
      const res = await request('/units/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bedrooms: 2 }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing unit', async function () {
      const res = await request('/units/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent unit', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/units/550e8400-e29b-41d4-a716-446655440099', {
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

      const res = await request('/units')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('unexpected')
    })
  })
})
