import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TUnitOwnership, TUnitOwnershipCreate, TUnitOwnershipUpdate } from '@packages/domain'
import { UnitOwnershipsController } from '@http/controllers/unit-ownerships'
import type { UnitOwnershipsRepository } from '@database/repositories'
import { withId, createTestApp, type IApiResponse } from './test-utils'

// Mock repository type with custom methods
type TMockUnitOwnershipsRepository = {
  listAll: () => Promise<TUnitOwnership[]>
  getById: (id: string) => Promise<TUnitOwnership | null>
  create: (data: TUnitOwnershipCreate) => Promise<TUnitOwnership>
  update: (id: string, data: TUnitOwnershipUpdate) => Promise<TUnitOwnership | null>
  delete: (id: string) => Promise<boolean>
  getByUnitId: (unitId: string) => Promise<TUnitOwnership[]>
  getByUserId: (userId: string) => Promise<TUnitOwnership[]>
  getByUnitAndUser: (unitId: string, userId: string) => Promise<TUnitOwnership | null>
  getPrimaryResidenceByUser: (userId: string) => Promise<TUnitOwnership | null>
}

function createUnitOwnership(
  unitId: string,
  userId: string,
  overrides: Partial<TUnitOwnershipCreate> = {}
): TUnitOwnershipCreate {
  return {
    unitId,
    userId,
    ownershipType: 'owner',
    ownershipPercentage: '100.000000',
    titleDeedNumber: null,
    titleDeedDate: null,
    isPrimaryResidence: false,
    startDate: new Date().toISOString().split('T')[0] as string,
    endDate: null,
    isActive: true,
    metadata: null,
    ...overrides,
  }
}

describe('UnitOwnershipsController', function () {
  let app: Hono
  let mockRepository: TMockUnitOwnershipsRepository
  let testUnitOwnerships: TUnitOwnership[]

  const unitId1 = '550e8400-e29b-41d4-a716-446655440010'
  const unitId2 = '550e8400-e29b-41d4-a716-446655440011'
  const userId1 = '550e8400-e29b-41d4-a716-446655440020'
  const userId2 = '550e8400-e29b-41d4-a716-446655440021'

  beforeEach(function () {
    // Create test data
    const uo1 = createUnitOwnership(unitId1, userId1, { isPrimaryResidence: true })
    const uo2 = createUnitOwnership(unitId2, userId1)
    const uo3 = createUnitOwnership(unitId1, userId2, {
      ownershipType: 'tenant',
      ownershipPercentage: '0.000000',
    })

    testUnitOwnerships = [
      withId(uo1, '550e8400-e29b-41d4-a716-446655440001') as TUnitOwnership,
      withId(uo2, '550e8400-e29b-41d4-a716-446655440002') as TUnitOwnership,
      withId(uo3, '550e8400-e29b-41d4-a716-446655440003') as TUnitOwnership,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testUnitOwnerships
      },
      getById: async function (id: string) {
        return (
          testUnitOwnerships.find(function (uo) {
            return uo.id === id
          }) || null
        )
      },
      create: async function (data: TUnitOwnershipCreate) {
        return withId(data, crypto.randomUUID()) as TUnitOwnership
      },
      update: async function (id: string, data: TUnitOwnershipUpdate) {
        const uo = testUnitOwnerships.find(function (item) {
          return item.id === id
        })
        if (!uo) return null
        return { ...uo, ...data } as TUnitOwnership
      },
      delete: async function (id: string) {
        return testUnitOwnerships.some(function (uo) {
          return uo.id === id
        })
      },
      getByUnitId: async function (unitId: string) {
        return testUnitOwnerships.filter(function (uo) {
          return uo.unitId === unitId
        })
      },
      getByUserId: async function (userId: string) {
        return testUnitOwnerships.filter(function (uo) {
          return uo.userId === userId
        })
      },
      getByUnitAndUser: async function (unitId: string, userId: string) {
        return (
          testUnitOwnerships.find(function (uo) {
            return uo.unitId === unitId && uo.userId === userId
          }) || null
        )
      },
      getPrimaryResidenceByUser: async function (userId: string) {
        return (
          testUnitOwnerships.find(function (uo) {
            return uo.userId === userId && uo.isPrimaryResidence
          }) || null
        )
      },
    }

    // Create controller with mock repository
    const controller = new UnitOwnershipsController(
      mockRepository as unknown as UnitOwnershipsRepository
    )

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/unit-ownerships', controller.createRouter())
  })

  describe('GET / (list)', function () {
    it('should return all unit-ownerships', async function () {
      const res = await app.request('/unit-ownerships')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no unit-ownerships exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await app.request('/unit-ownerships')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return unit-ownership by ID', async function () {
      const res = await app.request('/unit-ownerships/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.unitId).toBe(unitId1)
      expect(json.data.userId).toBe(userId1)
    })

    it('should return 404 when unit-ownership not found', async function () {
      const res = await app.request('/unit-ownerships/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await app.request('/unit-ownerships/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /unit/:unitId (getByUnitId)', function () {
    it('should return ownerships by unit ID', async function () {
      const res = await app.request(`/unit-ownerships/unit/${unitId1}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (uo: TUnitOwnership) {
          return uo.unitId === unitId1
        })
      ).toBe(true)
    })

    it('should return empty array when no ownerships for unit', async function () {
      mockRepository.getByUnitId = async function () {
        return []
      }

      const res = await app.request('/unit-ownerships/unit/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /user/:userId (getByUserId)', function () {
    it('should return ownerships by user ID', async function () {
      const res = await app.request(`/unit-ownerships/user/${userId1}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (uo: TUnitOwnership) {
          return uo.userId === userId1
        })
      ).toBe(true)
    })

    it('should return empty array when no ownerships for user', async function () {
      mockRepository.getByUserId = async function () {
        return []
      }

      const res = await app.request('/unit-ownerships/user/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /user/:userId/primary (getPrimaryResidenceByUser)', function () {
    it('should return primary residence for user', async function () {
      const res = await app.request(`/unit-ownerships/user/${userId1}/primary`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.isPrimaryResidence).toBe(true)
      expect(json.data.unitId).toBe(unitId1)
    })

    it('should return 404 when no primary residence for user', async function () {
      mockRepository.getPrimaryResidenceByUser = async function () {
        return null
      }

      const res = await app.request(`/unit-ownerships/user/${userId2}/primary`)
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('No primary residence found for user')
    })
  })

  describe('GET /unit/:unitId/user/:userId (getByUnitAndUser)', function () {
    it('should return ownership by unit and user', async function () {
      const res = await app.request(`/unit-ownerships/unit/${unitId1}/user/${userId1}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.unitId).toBe(unitId1)
      expect(json.data.userId).toBe(userId1)
    })

    it('should return 404 when ownership not found for unit and user', async function () {
      mockRepository.getByUnitAndUser = async function () {
        return null
      }

      const res = await app.request(`/unit-ownerships/unit/${unitId2}/user/${userId2}`)
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Unit ownership not found')
    })
  })

  describe('POST / (create)', function () {
    it('should create a new unit-ownership', async function () {
      const newOwnership = createUnitOwnership(unitId2, userId2)

      const res = await app.request('/unit-ownerships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOwnership),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.unitId).toBe(unitId2)
      expect(json.data.userId).toBe(userId2)
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await app.request('/unit-ownerships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId: 'invalid' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should return 409 when duplicate ownership exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newOwnership = createUnitOwnership(unitId1, userId1)

      const res = await app.request('/unit-ownerships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOwnership),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource already exists')
    })

    it('should return 400 for foreign key violations', async function () {
      mockRepository.create = async function () {
        throw new Error('violates foreign key constraint')
      }

      const newOwnership = createUnitOwnership('550e8400-e29b-41d4-a716-446655440099', userId1)

      const res = await app.request('/unit-ownerships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOwnership),
      })

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Invalid reference to related resource')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing unit-ownership', async function () {
      const res = await app.request('/unit-ownerships/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownershipPercentage: '50.000000' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.ownershipPercentage).toBe('50.000000')
    })

    it('should return 404 when updating non-existent ownership', async function () {
      const res = await app.request('/unit-ownerships/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownershipPercentage: '50.000000' }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing unit-ownership', async function () {
      const res = await app.request('/unit-ownerships/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent ownership', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await app.request('/unit-ownerships/550e8400-e29b-41d4-a716-446655440099', {
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

      const res = await app.request('/unit-ownerships')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('An unexpected error occurred')
    })
  })
})
