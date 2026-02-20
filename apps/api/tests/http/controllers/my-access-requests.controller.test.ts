import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import { MyAccessRequestsController } from '@http/controllers/my-access-requests'
import { createTestApp, type IApiResponse } from './test-utils'

const USER_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('MyAccessRequestsController', function () {
  let app: Hono
  let request: (path: string, options?: RequestInit) => Promise<Response>

  beforeEach(function () {
    // MyAccessRequestsController creates services internally that need DB access.
    // The services create their own repositories via new Repository(db).
    // We mock the db to support the chain: db.select().from().where()...
    // For validation-focused tests, the mock just needs to support basic operations.
    const createQueryChain = function (): any {
      const chain: any = {
        from: function () { return chain },
        where: function () { return chain },
        leftJoin: function () { return chain },
        innerJoin: function () { return chain },
        orderBy: function () { return chain },
        limit: function () { return chain },
        offset: function () { return Promise.resolve([]) },
        then: function (resolve: any) { return Promise.resolve([]).then(resolve) },
      }
      return chain
    }

    const createSelectChain = function () {
      return createQueryChain()
    }

    const mockDb = {
      select: createSelectChain,
      insert: function () {
        return {
          values: function () {
            return {
              returning: function () {
                return Promise.resolve([])
              },
            }
          },
        }
      },
      update: function () {
        return {
          set: function () {
            return {
              where: function () {
                return {
                  returning: function () {
                    return Promise.resolve([])
                  },
                }
              },
            }
          },
        }
      },
      transaction: async function (fn: any) {
        return fn(mockDb)
      },
    } as any

    const controller = new MyAccessRequestsController(mockDb)

    app = createTestApp()
    app.route('/me/access-requests', controller.createRouter())

    request = async function (path, options) {
      return app.request(path, options)
    }
  })

  describe('POST /validate-code', function () {
    it('should reject empty code', async function () {
      const res = await request('/me/access-requests/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '' }),
      })
      // Zod min(6) validation should reject empty string
      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should reject missing code field', async function () {
      const res = await request('/me/access-requests/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should reject code shorter than 6 characters', async function () {
      const res = await request('/me/access-requests/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'AB' }),
      })
      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should reject code longer than 8 characters', async function () {
      const res = await request('/me/access-requests/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'ABCDEFGHIJ' }),
      })
      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should reject null body', async function () {
      const res = await request('/me/access-requests/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(null),
      })
      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })
  })

  describe('POST / (submit)', function () {
    it('should reject missing required fields', async function () {
      const res = await request('/me/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should reject invalid ownership type', async function () {
      const res = await request('/me/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessCodeId: '550e8400-e29b-41d4-a716-446655440001',
          unitId: '550e8400-e29b-41d4-a716-446655440002',
          ownershipType: 'invalid_type',
        }),
      })
      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should reject invalid UUID for accessCodeId', async function () {
      const res = await request('/me/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessCodeId: 'not-a-uuid',
          unitId: '550e8400-e29b-41d4-a716-446655440002',
          ownershipType: 'owner',
        }),
      })
      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should reject invalid UUID for unitId', async function () {
      const res = await request('/me/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessCodeId: '550e8400-e29b-41d4-a716-446655440001',
          unitId: 'not-a-uuid',
          ownershipType: 'tenant',
        }),
      })
      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should reject missing accessCodeId', async function () {
      const res = await request('/me/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: '550e8400-e29b-41d4-a716-446655440002',
          ownershipType: 'owner',
        }),
      })
      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should reject null body', async function () {
      const res = await request('/me/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(null),
      })
      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })
  })

  describe('GET / (listMine)', function () {
    it('should return paginated response for authenticated user', async function () {
      const res = await request('/me/access-requests')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as any
      expect(json.data).toBeDefined()
      expect(json.pagination).toBeDefined()
      expect(json.pagination.page).toBe(1)
    })

    it('should accept page and limit query params', async function () {
      const res = await request('/me/access-requests?page=2&limit=10')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as any
      expect(json.pagination.page).toBe(2)
      expect(json.pagination.limit).toBe(10)
    })

    it('should accept status filter query param', async function () {
      const res = await request('/me/access-requests?status=pending')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as any
      expect(json.data).toBeDefined()
      expect(json.pagination).toBeDefined()
    })
  })
})
