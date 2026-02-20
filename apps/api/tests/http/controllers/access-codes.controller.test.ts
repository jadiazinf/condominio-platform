import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TCondominiumAccessCode } from '@packages/domain'
import { AccessCodesController } from '@http/controllers/access-codes'
import type { CondominiumAccessCodesRepository } from '@database/repositories'
import { createTestApp, type IApiResponse } from './test-utils'

const CONDO_ID = '550e8400-e29b-41d4-a716-446655440010'
const USER_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('AccessCodesController', function () {
  let app: Hono
  let request: (path: string, options?: RequestInit) => Promise<Response>

  const activeCode: TCondominiumAccessCode = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    condominiumId: CONDO_ID,
    code: 'ABC123',
    expiresAt: new Date(Date.now() + 86400000),
    isActive: true,
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(function () {
    const mockRepository = {
      getActiveByCondominiumId: async function (condominiumId: string) {
        if (condominiumId === CONDO_ID) return activeCode
        return null
      },
      deactivateAllForCondominium: async function () {},
      create: async function (data: any) {
        return {
          id: crypto.randomUUID(),
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      },
      getByCode: async function () {
        return null
      },
      update: async function (id: string, data: any) {
        if (id === activeCode.id) return { ...activeCode, ...data }
        return null
      },
      withTx: function () {
        return this
      },
      listAll: async function () {
        return [activeCode]
      },
      getById: async function (id: string) {
        return id === activeCode.id ? activeCode : null
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

    const controller = new AccessCodesController(
      mockRepository as unknown as CondominiumAccessCodesRepository,
      mockDb
    )

    app = createTestApp()
    app.route('/access-codes', controller.createRouter())

    request = async function (path, options) {
      return app.request(path, options)
    }
  })

  describe('GET /active', function () {
    it('should return active code for condominium', async function () {
      const res = await request('/access-codes/active', {
        headers: { 'x-condominium-id': CONDO_ID },
      })
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toBeDefined()
      expect(json.data.code).toBe('ABC123')
      expect(json.data.condominiumId).toBe(CONDO_ID)
      expect(json.data.isActive).toBe(true)
    })

    it('should return null when no active code exists', async function () {
      const res = await request('/access-codes/active', {
        headers: { 'x-condominium-id': '550e8400-e29b-41d4-a716-446655440099' },
      })
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toBeNull()
    })
  })

  describe('POST /generate', function () {
    it('should generate a new access code with valid validity', async function () {
      const res = await request('/access-codes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-condominium-id': CONDO_ID,
        },
        body: JSON.stringify({ validity: '7_days' }),
      })
      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toBeDefined()
      expect(json.data.condominiumId).toBe(CONDO_ID)
      expect(json.data.isActive).toBe(true)
    })

    it('should generate code with 1_day validity', async function () {
      const res = await request('/access-codes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-condominium-id': CONDO_ID,
        },
        body: JSON.stringify({ validity: '1_day' }),
      })
      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toBeDefined()
    })

    it('should generate code with 1_month validity', async function () {
      const res = await request('/access-codes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-condominium-id': CONDO_ID,
        },
        body: JSON.stringify({ validity: '1_month' }),
      })
      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toBeDefined()
    })

    it('should generate code with 1_year validity', async function () {
      const res = await request('/access-codes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-condominium-id': CONDO_ID,
        },
        body: JSON.stringify({ validity: '1_year' }),
      })
      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toBeDefined()
    })

    it('should reject invalid validity value', async function () {
      const res = await request('/access-codes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-condominium-id': CONDO_ID,
        },
        body: JSON.stringify({ validity: 'invalid' }),
      })
      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should reject missing validity field', async function () {
      const res = await request('/access-codes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-condominium-id': CONDO_ID,
        },
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should reject empty body', async function () {
      const res = await request('/access-codes/generate', {
        method: 'POST',
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
    it('should return 500 when getActive service fails unexpectedly', async function () {
      // Override the mock to throw
      const failingRepository = {
        getActiveByCondominiumId: async function () {
          throw new Error('Unexpected database error')
        },
        deactivateAllForCondominium: async function () {},
        create: async function () {
          return activeCode
        },
        getByCode: async function () {
          return null
        },
        update: async function () {
          return null
        },
        withTx: function () {
          return this
        },
        listAll: async function () {
          return []
        },
        getById: async function () {
          return null
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

      const controller = new AccessCodesController(
        failingRepository as unknown as CondominiumAccessCodesRepository,
        mockDb
      )

      const errorApp = createTestApp()
      errorApp.route('/access-codes', controller.createRouter())

      const res = await errorApp.request('/access-codes/active', {
        headers: { 'x-condominium-id': CONDO_ID },
      })
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
    })
  })
})
