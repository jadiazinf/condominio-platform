import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TCurrency, TCurrencyCreate, TCurrencyUpdate } from '@packages/domain'
import { CurrenciesController } from '@http/controllers/currencies'
import type { CurrenciesRepository } from '@database/repositories'
import { CurrencyFactory } from '../../setup/factories'
import {
  withId,
  createTestApp,
  getErrorMessage,
  type IApiResponse,
  type IStandardErrorResponse,
} from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockCurrenciesRepository = {
  listAll: () => Promise<TCurrency[]>
  getById: (id: string) => Promise<TCurrency | null>
  create: (data: TCurrencyCreate) => Promise<TCurrency>
  update: (id: string, data: TCurrencyUpdate) => Promise<TCurrency | null>
  delete: (id: string) => Promise<boolean>
  getByCode: (code: string) => Promise<TCurrency | null>
  getBaseCurrency: () => Promise<TCurrency | null>
}

describe('CurrenciesController', function () {
  let app: Hono
  let request: (path: string, options?: RequestInit) => Promise<Response>
  let mockRepository: TMockCurrenciesRepository
  let testCurrencies: TCurrency[]

  beforeEach(function () {
    // Create test data
    const usd = CurrencyFactory.usd({ isBaseCurrency: true })
    const eur = CurrencyFactory.eur()

    testCurrencies = [
      withId(usd, '550e8400-e29b-41d4-a716-446655440001') as TCurrency,
      withId(eur, '550e8400-e29b-41d4-a716-446655440002') as TCurrency,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testCurrencies
      },
      getById: async function (id: string) {
        return (
          testCurrencies.find(function (c) {
            return c.id === id
          }) || null
        )
      },
      create: async function (data: TCurrencyCreate) {
        return withId(data, crypto.randomUUID()) as TCurrency
      },
      update: async function (id: string, data: TCurrencyUpdate) {
        const currency = testCurrencies.find(function (c) {
          return c.id === id
        })
        if (!currency) return null
        return { ...currency, ...data } as TCurrency
      },
      delete: async function (id: string) {
        return testCurrencies.some(function (c) {
          return c.id === id
        })
      },
      getByCode: async function (code: string) {
        return (
          testCurrencies.find(function (c) {
            return c.code === code
          }) || null
        )
      },
      getBaseCurrency: async function () {
        return (
          testCurrencies.find(function (c) {
            return c.isBaseCurrency
          }) || null
        )
      },
    }

    // Create controller with mock repository
    const controller = new CurrenciesController(mockRepository as unknown as CurrenciesRepository)

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/currencies', controller.createRouter())

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all currencies', async function () {
      const res = await request('/currencies')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
    })

    it('should return empty array when no currencies exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/currencies')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return currency by ID', async function () {
      const res = await request('/currencies/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.code).toBe('USD')
    })

    it('should return 404 when currency not found', async function () {
      const res = await request('/currencies/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/currencies/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /code/:code (getByCode)', function () {
    it('should return currency by code', async function () {
      const res = await request('/currencies/code/USD')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.code).toBe('USD')
      expect(json.data.name).toBe('US Dollar')
    })

    it('should return 404 when currency with code not found', async function () {
      const res = await request('/currencies/code/GBP')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toBe('Currency not found')
    })
  })

  describe('GET /base (getBaseCurrency)', function () {
    it('should return the base currency', async function () {
      const res = await request('/currencies/base')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.code).toBe('USD')
      expect(json.data.isBaseCurrency).toBe(true)
    })

    it('should return 404 when no base currency configured', async function () {
      mockRepository.getBaseCurrency = async function () {
        return null
      }

      const res = await request('/currencies/base')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toBe('No base currency configured')
    })
  })

  describe('POST / (create)', function () {
    it('should create a new currency', async function () {
      const newCurrency = CurrencyFactory.create({ code: 'GBP', name: 'British Pound' })

      const res = await request('/currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCurrency),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.code).toBe('GBP')
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body with validation error details', async function () {
      const res = await request('/currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)

      const json = (await res.json()) as IStandardErrorResponse
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ErrorCodes.VALIDATION_ERROR)
      expect(json.error.message).toBeDefined()
      expect(json.error.fields).toBeDefined()
      expect(Array.isArray(json.error.fields)).toBe(true)
      expect(json.error.fields!.length).toBeGreaterThan(0)
    })

    it('should return 409 when duplicate currency exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newCurrency = CurrencyFactory.create({ code: 'USD' })

      const res = await request('/currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCurrency),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('already exists')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing currency', async function () {
      const res = await request('/currencies/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'United States Dollar' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('United States Dollar')
    })

    it('should return 404 when updating non-existent currency', async function () {
      const res = await request('/currencies/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing currency', async function () {
      const res = await request('/currencies/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent currency', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/currencies/550e8400-e29b-41d4-a716-446655440099', {
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

      const res = await request('/currencies')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('unexpected')
    })
  })
})
