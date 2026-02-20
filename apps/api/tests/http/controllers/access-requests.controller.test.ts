import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import { AccessRequestsController } from '@http/controllers/access-requests'
import type { AccessRequestsRepository } from '@database/repositories'
import { createTestApp, type IApiResponse } from './test-utils'

const CONDO_ID = '550e8400-e29b-41d4-a716-446655440010'
const REQUEST_ID = '550e8400-e29b-41d4-a716-446655440001'
const USER_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('AccessRequestsController', function () {
  let app: Hono
  let request: (path: string, options?: RequestInit) => Promise<Response>
  let mockRepository: any

  const testRequests = [
    {
      id: REQUEST_ID,
      condominiumId: CONDO_ID,
      unitId: '550e8400-e29b-41d4-a716-446655440020',
      userId: '550e8400-e29b-41d4-a716-446655440030',
      accessCodeId: '550e8400-e29b-41d4-a716-446655440040',
      ownershipType: 'tenant',
      status: 'pending',
      adminNotes: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      condominiumId: CONDO_ID,
      unitId: '550e8400-e29b-41d4-a716-446655440021',
      userId: '550e8400-e29b-41d4-a716-446655440031',
      accessCodeId: '550e8400-e29b-41d4-a716-446655440040',
      ownershipType: 'owner',
      status: 'approved',
      adminNotes: 'Approved by admin',
      reviewedBy: USER_ID,
      reviewedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      listByCondominiumPaginated: async function (condominiumId: string, options?: { page?: number; limit?: number; status?: string; search?: string }) {
        let result = testRequests.filter(function (r) {
          return r.condominiumId === condominiumId
        })
        if (options?.status) {
          result = result.filter(function (r) {
            return r.status === options.status
          })
        }
        const page = options?.page ?? 1
        const limit = options?.limit ?? 20
        return {
          data: result,
          pagination: { page, limit, total: result.length, totalPages: Math.ceil(result.length / limit) },
        }
      },
      countPending: async function (condominiumId: string) {
        return testRequests.filter(function (r) {
          return r.condominiumId === condominiumId && r.status === 'pending'
        }).length
      },
      getById: async function (id: string) {
        return (
          testRequests.find(function (r) {
            return r.id === id
          }) || null
        )
      },
      update: async function (id: string, data: any) {
        const req = testRequests.find(function (r) {
          return r.id === id
        })
        if (!req) return null
        return { ...req, ...data }
      },
      withTx: function () {
        return this
      },
      listAll: async function () {
        return testRequests
      },
      create: async function (data: any) {
        return { id: crypto.randomUUID(), ...data, createdAt: new Date(), updatedAt: new Date() }
      },
      delete: async function () {
        return false
      },
    }

    const mockDb = {
      transaction: async function (fn: any) {
        return fn(mockDb)
      },
    } as any

    const controller = new AccessRequestsController(
      mockRepository as unknown as AccessRequestsRepository,
      mockDb
    )

    app = createTestApp()
    app.route('/access-requests', controller.createRouter())

    request = async function (path, options) {
      return app.request(path, options)
    }
  })

  describe('GET / (list)', function () {
    it('should return all access requests for condominium', async function () {
      const res = await request('/access-requests', {
        headers: { 'x-condominium-id': CONDO_ID },
      })
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as any
      expect(json.data).toHaveLength(2)
      expect(json.pagination).toBeDefined()
      expect(json.pagination.total).toBe(2)
    })

    it('should filter by status when query param provided', async function () {
      const res = await request('/access-requests?status=pending', {
        headers: { 'x-condominium-id': CONDO_ID },
      })
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as any
      expect(json.data).toHaveLength(1)
      expect(json.data[0].status).toBe('pending')
    })

    it('should filter by approved status', async function () {
      const res = await request('/access-requests?status=approved', {
        headers: { 'x-condominium-id': CONDO_ID },
      })
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as any
      expect(json.data).toHaveLength(1)
      expect(json.data[0].status).toBe('approved')
    })

    it('should return empty array when no requests for condominium', async function () {
      const res = await request('/access-requests', {
        headers: { 'x-condominium-id': '550e8400-e29b-41d4-a716-446655440099' },
      })
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as any
      expect(json.data).toHaveLength(0)
    })

    it('should return empty when filtering by status with no matches', async function () {
      const res = await request('/access-requests?status=rejected', {
        headers: { 'x-condominium-id': CONDO_ID },
      })
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as any
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /count', function () {
    it('should return pending count for condominium', async function () {
      const res = await request('/access-requests/count', {
        headers: { 'x-condominium-id': CONDO_ID },
      })
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.count).toBe(1)
    })

    it('should return 0 when no pending requests', async function () {
      const res = await request('/access-requests/count', {
        headers: { 'x-condominium-id': '550e8400-e29b-41d4-a716-446655440099' },
      })
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.count).toBe(0)
    })
  })

  describe('PATCH /:id/review', function () {
    it('should return 400 for invalid UUID param', async function () {
      const res = await request('/access-requests/invalid-id/review', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-condominium-id': CONDO_ID,
        },
        body: JSON.stringify({ status: 'approved' }),
      })
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })

    it('should return 422 for invalid status in body', async function () {
      const res = await request(`/access-requests/${REQUEST_ID}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-condominium-id': CONDO_ID,
        },
        body: JSON.stringify({ status: 'invalid_status' }),
      })
      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should return 422 for missing status field', async function () {
      const res = await request(`/access-requests/${REQUEST_ID}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-condominium-id': CONDO_ID,
        },
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should return 422 for empty body', async function () {
      const res = await request(`/access-requests/${REQUEST_ID}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-condominium-id': CONDO_ID,
        },
        body: JSON.stringify(null),
      })
      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })
  })

  describe('Error handling', function () {
    it('should return 500 when list throws unexpected error', async function () {
      mockRepository.listByCondominiumPaginated = async function () {
        throw new Error('Unexpected database error')
      }

      const res = await request('/access-requests', {
        headers: { 'x-condominium-id': CONDO_ID },
      })
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
    })

    it('should return 500 when countPending throws unexpected error', async function () {
      mockRepository.countPending = async function () {
        throw new Error('Unexpected database error')
      }

      const res = await request('/access-requests/count', {
        headers: { 'x-condominium-id': CONDO_ID },
      })
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
    })
  })
})
