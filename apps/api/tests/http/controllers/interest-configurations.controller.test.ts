import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type {
  TInterestConfiguration,
  TInterestConfigurationCreate,
  TInterestConfigurationUpdate,
} from '@packages/domain'
import { InterestConfigurationsController } from '@http/controllers/interest-configurations'
import type { InterestConfigurationsRepository } from '@database/repositories'
import {
  withId,
  createTestApp,
  getErrorMessage,
  type IApiResponse,
  type IStandardErrorResponse,
} from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockInterestConfigurationsRepository = {
  listAll: () => Promise<TInterestConfiguration[]>
  getById: (id: string) => Promise<TInterestConfiguration | null>
  create: (data: TInterestConfigurationCreate) => Promise<TInterestConfiguration>
  update: (id: string, data: TInterestConfigurationUpdate) => Promise<TInterestConfiguration | null>
  delete: (id: string) => Promise<boolean>
  getByCondominiumId: (condominiumId: string) => Promise<TInterestConfiguration[]>
  getByPaymentConceptId: (paymentConceptId: string) => Promise<TInterestConfiguration[]>
  getActiveForDate: (
    paymentConceptId: string,
    date: string
  ) => Promise<TInterestConfiguration | null>
}

function createInterestConfiguration(
  paymentConceptId: string,
  overrides: Partial<TInterestConfigurationCreate> = {}
): TInterestConfigurationCreate {
  return {
    paymentConceptId,
    condominiumId: null,
    buildingId: null,
    name: 'Default Interest Configuration',
    description: null,
    interestType: 'simple',
    interestRate: '0.050000',
    fixedAmount: null,
    calculationPeriod: 'monthly',
    gracePeriodDays: 5,
    currencyId: null,
    isActive: true,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    metadata: null,
    createdBy: null,
    ...overrides,
  }
}

describe('InterestConfigurationsController', function () {
  let app: Hono
  let request: (path: string, options?: RequestInit) => Promise<Response>
  let mockRepository: TMockInterestConfigurationsRepository
  let testConfigs: TInterestConfiguration[]

  const condominiumId = '550e8400-e29b-41d4-a716-446655440010'
  const paymentConceptId1 = '550e8400-e29b-41d4-a716-446655440020'
  const paymentConceptId2 = '550e8400-e29b-41d4-a716-446655440021'

  beforeEach(function () {
    // Create test data
    const config1 = createInterestConfiguration(paymentConceptId1, { condominiumId })
    const config2 = createInterestConfiguration(paymentConceptId2, {
      interestType: 'compound',
      interestRate: '0.030000',
    })
    const config3 = createInterestConfiguration(paymentConceptId1, {
      effectiveFrom: '2023-01-01',
      effectiveTo: '2023-12-31',
      isActive: false,
    })

    testConfigs = [
      withId(config1, '550e8400-e29b-41d4-a716-446655440001') as TInterestConfiguration,
      withId(config2, '550e8400-e29b-41d4-a716-446655440002') as TInterestConfiguration,
      withId(config3, '550e8400-e29b-41d4-a716-446655440003') as TInterestConfiguration,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testConfigs
      },
      getById: async function (id: string) {
        return (
          testConfigs.find(function (c) {
            return c.id === id
          }) || null
        )
      },
      create: async function (data: TInterestConfigurationCreate) {
        return withId(data, crypto.randomUUID()) as TInterestConfiguration
      },
      update: async function (id: string, data: TInterestConfigurationUpdate) {
        const c = testConfigs.find(function (item) {
          return item.id === id
        })
        if (!c) return null
        return { ...c, ...data } as TInterestConfiguration
      },
      delete: async function (id: string) {
        return testConfigs.some(function (c) {
          return c.id === id
        })
      },
      getByCondominiumId: async function (condominiumId: string) {
        return testConfigs.filter(function (c) {
          return c.condominiumId === condominiumId
        })
      },
      getByPaymentConceptId: async function (paymentConceptId: string) {
        return testConfigs.filter(function (c) {
          return c.paymentConceptId === paymentConceptId
        })
      },
      getActiveForDate: async function (paymentConceptId: string, date: string) {
        return (
          testConfigs.find(function (c) {
            if (c.paymentConceptId !== paymentConceptId) return false
            if (!c.isActive) return false
            if (c.effectiveFrom > date) return false
            if (c.effectiveTo && c.effectiveTo < date) return false
            return true
          }) || null
        )
      },
    }

    // Create controller with mock repository
    const controller = new InterestConfigurationsController(
      mockRepository as unknown as InterestConfigurationsRepository
    )

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/interest-configurations', controller.createRouter())

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all interest configurations', async function () {
      const res = await request('/interest-configurations')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no configurations exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/interest-configurations')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return configuration by ID', async function () {
      const res = await request('/interest-configurations/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.paymentConceptId).toBe(paymentConceptId1)
      expect(json.data.interestType).toBe('simple')
    })

    it('should return 404 when configuration not found', async function () {
      const res = await request('/interest-configurations/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/interest-configurations/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /condominium/:condominiumId (getByCondominiumId)', function () {
    it('should return configurations by condominium ID', async function () {
      const res = await request(`/interest-configurations/condominium/${condominiumId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].condominiumId).toBe(condominiumId)
    })

    it('should return empty array when no configs for condominium', async function () {
      mockRepository.getByCondominiumId = async function () {
        return []
      }

      const res = await request(
        '/interest-configurations/condominium/550e8400-e29b-41d4-a716-446655440099'
      )
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /payment-concept/:paymentConceptId (getByPaymentConceptId)', function () {
    it('should return configurations by payment concept ID', async function () {
      const res = await request(`/interest-configurations/payment-concept/${paymentConceptId1}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (c: TInterestConfiguration) {
          return c.paymentConceptId === paymentConceptId1
        })
      ).toBe(true)
    })

    it('should return empty array when no configs for payment concept', async function () {
      mockRepository.getByPaymentConceptId = async function () {
        return []
      }

      const res = await request(
        '/interest-configurations/payment-concept/550e8400-e29b-41d4-a716-446655440099'
      )
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /payment-concept/:paymentConceptId/active/:date (getActiveForDate)', function () {
    it('should return active configuration for date', async function () {
      const res = await request(
        `/interest-configurations/payment-concept/${paymentConceptId1}/active/2024-06-15`
      )
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.paymentConceptId).toBe(paymentConceptId1)
      expect(json.data.isActive).toBe(true)
    })

    it('should return 404 when no active configuration for date', async function () {
      mockRepository.getActiveForDate = async function () {
        return null
      }

      const res = await request(
        `/interest-configurations/payment-concept/${paymentConceptId1}/active/2022-01-01`
      )
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toBe('No active interest configuration found for this date')
    })

    it('should return 400 for invalid date format', async function () {
      const res = await request(
        `/interest-configurations/payment-concept/${paymentConceptId1}/active/invalid-date`
      )
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new interest configuration', async function () {
      const newConfig = createInterestConfiguration(paymentConceptId2, { interestRate: '0.080000' })

      const res = await request('/interest-configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.paymentConceptId).toBe(paymentConceptId2)
      expect(json.data.interestRate).toBe('0.080000')
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/interest-configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentConceptId: 'invalid' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)

      const json = (await res.json()) as IStandardErrorResponse
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ErrorCodes.VALIDATION_ERROR)
      expect(json.error.message).toBeDefined()
      expect(json.error.fields).toBeDefined()
      expect(Array.isArray(json.error.fields)).toBe(true)
    })

    it('should return 409 when duplicate configuration exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newConfig = createInterestConfiguration(paymentConceptId1)

      const res = await request('/interest-configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('already exists')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing configuration', async function () {
      const res = await request('/interest-configurations/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestRate: '0.060000' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.interestRate).toBe('0.060000')
    })

    it('should return 404 when updating non-existent configuration', async function () {
      const res = await request('/interest-configurations/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestRate: '0.060000' }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing configuration', async function () {
      const res = await request('/interest-configurations/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent configuration', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/interest-configurations/550e8400-e29b-41d4-a716-446655440099', {
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

      const res = await request('/interest-configurations')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('unexpected')
    })
  })
})
