import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TExchangeRate, TExchangeRateCreate, TExchangeRateUpdate } from '@packages/domain'
import { ExchangeRatesController } from '@http/controllers/exchange-rates'
import type { ExchangeRatesRepository } from '@database/repositories'
import {
  withId,
  createTestApp,
  getErrorMessage,
  type IApiResponse,
  type IStandardErrorResponse,
} from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockExchangeRatesRepository = {
  listAll: () => Promise<TExchangeRate[]>
  getById: (id: string) => Promise<TExchangeRate | null>
  create: (data: TExchangeRateCreate) => Promise<TExchangeRate>
  update: (id: string, data: TExchangeRateUpdate) => Promise<TExchangeRate | null>
  delete: (id: string) => Promise<boolean>
  getByDate: (date: string) => Promise<TExchangeRate[]>
  getLatestRate: (fromCurrencyId: string, toCurrencyId: string) => Promise<TExchangeRate | null>
}

function createExchangeRate(
  fromCurrencyId: string,
  toCurrencyId: string,
  overrides: Partial<TExchangeRateCreate> = {}
): TExchangeRateCreate {
  return {
    fromCurrencyId,
    toCurrencyId,
    rate: '1.100000',
    effectiveDate: new Date().toISOString().split('T')[0] as string,
    source: 'manual',
    isActive: true,
    createdBy: null,
    registeredBy: null,
    ...overrides,
  }
}

describe('ExchangeRatesController', function () {
  let app: Hono
  let request: (path: string, options?: RequestInit) => Promise<Response>
  let mockRepository: TMockExchangeRatesRepository
  let testExchangeRates: TExchangeRate[]

  const currencyId1 = '550e8400-e29b-41d4-a716-446655440010' // USD
  const currencyId2 = '550e8400-e29b-41d4-a716-446655440011' // EUR
  const currencyId3 = '550e8400-e29b-41d4-a716-446655440012' // VES
  const testDate = '2024-01-15'

  beforeEach(function () {
    // Create test data
    const rate1 = createExchangeRate(currencyId1, currencyId2, {
      rate: '0.920000',
      effectiveDate: testDate,
    })
    const rate2 = createExchangeRate(currencyId1, currencyId3, {
      rate: '36.500000',
      effectiveDate: testDate,
    })
    const rate3 = createExchangeRate(currencyId2, currencyId3, {
      rate: '39.700000',
      effectiveDate: testDate,
    })

    testExchangeRates = [
      withId(rate1, '550e8400-e29b-41d4-a716-446655440001') as TExchangeRate,
      withId(rate2, '550e8400-e29b-41d4-a716-446655440002') as TExchangeRate,
      withId(rate3, '550e8400-e29b-41d4-a716-446655440003') as TExchangeRate,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testExchangeRates
      },
      getById: async function (id: string) {
        return (
          testExchangeRates.find(function (er) {
            return er.id === id
          }) || null
        )
      },
      create: async function (data: TExchangeRateCreate) {
        return withId(data, crypto.randomUUID()) as TExchangeRate
      },
      update: async function (id: string, data: TExchangeRateUpdate) {
        const er = testExchangeRates.find(function (item) {
          return item.id === id
        })
        if (!er) return null
        return { ...er, ...data } as TExchangeRate
      },
      delete: async function (id: string) {
        return testExchangeRates.some(function (er) {
          return er.id === id
        })
      },
      getByDate: async function (date: string) {
        return testExchangeRates.filter(function (er) {
          return er.effectiveDate === date
        })
      },
      getLatestRate: async function (fromCurrencyId: string, toCurrencyId: string) {
        return (
          testExchangeRates.find(function (er) {
            return er.fromCurrencyId === fromCurrencyId && er.toCurrencyId === toCurrencyId
          }) || null
        )
      },
    }

    // Create controller with mock repository
    const controller = new ExchangeRatesController(
      mockRepository as unknown as ExchangeRatesRepository
    )

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/exchange-rates', controller.createRouter())

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all exchange rates', async function () {
      const res = await request('/exchange-rates')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no exchange rates exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/exchange-rates')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return exchange rate by ID', async function () {
      const res = await request('/exchange-rates/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.fromCurrencyId).toBe(currencyId1)
      expect(json.data.toCurrencyId).toBe(currencyId2)
      expect(json.data.rate).toBe('0.920000')
    })

    it('should return 404 when exchange rate not found', async function () {
      const res = await request('/exchange-rates/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/exchange-rates/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /date/:date (getByDate)', function () {
    it('should return exchange rates by date', async function () {
      const res = await request(`/exchange-rates/date/${testDate}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
      expect(
        json.data.every(function (er: TExchangeRate) {
          return er.effectiveDate === testDate
        })
      ).toBe(true)
    })

    it('should return empty array when no rates for date', async function () {
      mockRepository.getByDate = async function () {
        return []
      }

      const res = await request('/exchange-rates/date/2020-01-01')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })

    it('should return 400 for invalid date format', async function () {
      const res = await request('/exchange-rates/date/invalid-date')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /latest/:fromCurrencyId/:toCurrencyId (getLatestRate)', function () {
    it('should return latest rate for currency pair', async function () {
      const res = await request(`/exchange-rates/latest/${currencyId1}/${currencyId2}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.fromCurrencyId).toBe(currencyId1)
      expect(json.data.toCurrencyId).toBe(currencyId2)
    })

    it('should return 404 when no rate for currency pair', async function () {
      mockRepository.getLatestRate = async function () {
        return null
      }

      const res = await request(`/exchange-rates/latest/${currencyId2}/${currencyId1}`)
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toBe('Exchange rate not found')
    })

    it('should return 400 for invalid currency UUID', async function () {
      const res = await request('/exchange-rates/latest/invalid-id/another-invalid')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new exchange rate', async function () {
      const newRate = createExchangeRate(currencyId2, currencyId1, { rate: '1.087000' })

      const res = await request('/exchange-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRate),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.fromCurrencyId).toBe(currencyId2)
      expect(json.data.toCurrencyId).toBe(currencyId1)
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/exchange-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromCurrencyId: 'invalid' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)

      const json = (await res.json()) as IStandardErrorResponse
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ErrorCodes.VALIDATION_ERROR)
      expect(json.error.message).toBeDefined()
      expect(json.error.fields).toBeDefined()
      expect(Array.isArray(json.error.fields)).toBe(true)
    })

    it('should return 409 when duplicate exchange rate exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newRate = createExchangeRate(currencyId1, currencyId2)

      const res = await request('/exchange-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRate),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('already exists')
    })

    it('should return 400 for foreign key violations', async function () {
      mockRepository.create = async function () {
        throw new Error('violates foreign key constraint')
      }

      const newRate = createExchangeRate('550e8400-e29b-41d4-a716-446655440099', currencyId2)

      const res = await request('/exchange-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRate),
      })

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('reference')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing exchange rate', async function () {
      const res = await request('/exchange-rates/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: '0.950000' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.rate).toBe('0.950000')
    })

    it('should return 404 when updating non-existent rate', async function () {
      const res = await request('/exchange-rates/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: '1.000000' }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing exchange rate', async function () {
      const res = await request('/exchange-rates/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent rate', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/exchange-rates/550e8400-e29b-41d4-a716-446655440099', {
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

      const res = await request('/exchange-rates')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('unexpected')
    })
  })
})
