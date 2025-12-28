import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TQuota, TQuotaCreate, TQuotaUpdate } from '@packages/domain'
import { QuotasController } from '@http/controllers/quotas'
import type { QuotasRepository } from '@database/repositories'
import { withId, createTestApp, type IApiResponse } from './test-utils'

// Mock repository type with custom methods
type TMockQuotasRepository = {
  listAll: () => Promise<TQuota[]>
  getById: (id: string) => Promise<TQuota | null>
  create: (data: TQuotaCreate) => Promise<TQuota>
  update: (id: string, data: TQuotaUpdate) => Promise<TQuota | null>
  delete: (id: string) => Promise<boolean>
  getByUnitId: (unitId: string) => Promise<TQuota[]>
  getPendingByUnit: (unitId: string) => Promise<TQuota[]>
  getByStatus: (status: string) => Promise<TQuota[]>
  getOverdue: (date: string) => Promise<TQuota[]>
  getByPeriod: (year: number, month?: number) => Promise<TQuota[]>
}

function createQuota(
  unitId: string,
  paymentConceptId: string,
  overrides: Partial<TQuotaCreate> = {}
): TQuotaCreate {
  return {
    unitId,
    paymentConceptId,
    baseAmount: '100.00',
    currencyId: '550e8400-e29b-41d4-a716-446655440050',
    interestAmount: '0',
    amountInBaseCurrency: null,
    exchangeRateUsed: null,
    issueDate: '2024-01-01',
    dueDate: '2024-01-15',
    status: 'pending',
    periodYear: 2024,
    periodMonth: 1,
    periodDescription: 'Monthly maintenance quota',
    paidAmount: '0',
    balance: '100.00',
    notes: null,
    metadata: null,
    createdBy: null,
    ...overrides,
  }
}

describe('QuotasController', function () {
  let app: Hono
  let mockRepository: TMockQuotasRepository
  let testQuotas: TQuota[]

  const unitId1 = '550e8400-e29b-41d4-a716-446655440010'
  const unitId2 = '550e8400-e29b-41d4-a716-446655440011'
  const paymentConceptId = '550e8400-e29b-41d4-a716-446655440020'

  beforeEach(function () {
    // Create test data
    const quota1 = createQuota(unitId1, paymentConceptId, { status: 'pending', periodMonth: 1 })
    const quota2 = createQuota(unitId1, paymentConceptId, { status: 'paid', periodMonth: 2 })
    const quota3 = createQuota(unitId2, paymentConceptId, {
      status: 'overdue',
      dueDate: '2023-12-15',
      periodMonth: 12,
      periodYear: 2023,
    })

    testQuotas = [
      withId(quota1, '550e8400-e29b-41d4-a716-446655440001') as TQuota,
      withId(quota2, '550e8400-e29b-41d4-a716-446655440002') as TQuota,
      withId(quota3, '550e8400-e29b-41d4-a716-446655440003') as TQuota,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testQuotas
      },
      getById: async function (id: string) {
        return (
          testQuotas.find(function (q) {
            return q.id === id
          }) || null
        )
      },
      create: async function (data: TQuotaCreate) {
        return withId(data, crypto.randomUUID()) as TQuota
      },
      update: async function (id: string, data: TQuotaUpdate) {
        const q = testQuotas.find(function (item) {
          return item.id === id
        })
        if (!q) return null
        return { ...q, ...data } as TQuota
      },
      delete: async function (id: string) {
        return testQuotas.some(function (q) {
          return q.id === id
        })
      },
      getByUnitId: async function (unitId: string) {
        return testQuotas.filter(function (q) {
          return q.unitId === unitId
        })
      },
      getPendingByUnit: async function (unitId: string) {
        return testQuotas.filter(function (q) {
          return q.unitId === unitId && q.status === 'pending'
        })
      },
      getByStatus: async function (status: string) {
        return testQuotas.filter(function (q) {
          return q.status === status
        })
      },
      getOverdue: async function () {
        return testQuotas.filter(function (q) {
          return q.status === 'overdue'
        })
      },
      getByPeriod: async function (year: number, month?: number) {
        return testQuotas.filter(function (q) {
          if (q.periodYear !== year) return false
          if (month !== undefined && q.periodMonth !== month) return false
          return true
        })
      },
    }

    // Create controller with mock repository
    const controller = new QuotasController(mockRepository as unknown as QuotasRepository)

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/quotas', controller.createRouter())
  })

  describe('GET / (list)', function () {
    it('should return all quotas', async function () {
      const res = await app.request('/quotas')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no quotas exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await app.request('/quotas')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return quota by ID', async function () {
      const res = await app.request('/quotas/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.unitId).toBe(unitId1)
      expect(json.data.status).toBe('pending')
    })

    it('should return 404 when quota not found', async function () {
      const res = await app.request('/quotas/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await app.request('/quotas/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /unit/:unitId (getByUnitId)', function () {
    it('should return quotas by unit ID', async function () {
      const res = await app.request(`/quotas/unit/${unitId1}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (q: TQuota) {
          return q.unitId === unitId1
        })
      ).toBe(true)
    })

    it('should return empty array when no quotas for unit', async function () {
      mockRepository.getByUnitId = async function () {
        return []
      }

      const res = await app.request('/quotas/unit/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /unit/:unitId/pending (getPendingByUnit)', function () {
    it('should return pending quotas for unit', async function () {
      const res = await app.request(`/quotas/unit/${unitId1}/pending`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].status).toBe('pending')
    })

    it('should return empty array when no pending quotas', async function () {
      mockRepository.getPendingByUnit = async function () {
        return []
      }

      const res = await app.request(`/quotas/unit/${unitId2}/pending`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /status/:status (getByStatus)', function () {
    it('should return quotas by status', async function () {
      const res = await app.request('/quotas/status/pending')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].status).toBe('pending')
    })

    it('should return paid quotas', async function () {
      const res = await app.request('/quotas/status/paid')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].status).toBe('paid')
    })

    it('should return 400 for invalid status', async function () {
      const res = await app.request('/quotas/status/invalid')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /overdue/:date (getOverdue)', function () {
    it('should return overdue quotas as of date', async function () {
      const res = await app.request('/quotas/overdue/2024-01-01')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].status).toBe('overdue')
    })

    it('should return empty array when no overdue quotas', async function () {
      mockRepository.getOverdue = async function () {
        return []
      }

      const res = await app.request('/quotas/overdue/2023-01-01')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })

    it('should return 400 for invalid date format', async function () {
      const res = await app.request('/quotas/overdue/invalid-date')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /period (getByPeriod)', function () {
    it('should return quotas by year', async function () {
      const res = await app.request('/quotas/period?year=2024')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
    })

    it('should return quotas by year and month', async function () {
      const res = await app.request('/quotas/period?year=2024&month=1')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
    })

    it('should return 400 when year is missing', async function () {
      const res = await app.request('/quotas/period')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new quota', async function () {
      const newQuota = createQuota(unitId2, paymentConceptId, { periodMonth: 3 })

      const res = await app.request('/quotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuota),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.unitId).toBe(unitId2)
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await app.request('/quotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId: 'invalid' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should return 409 when duplicate quota exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newQuota = createQuota(unitId1, paymentConceptId)

      const res = await app.request('/quotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuota),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource already exists')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing quota', async function () {
      const res = await app.request('/quotas/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.status).toBe('paid')
    })

    it('should return 404 when updating non-existent quota', async function () {
      const res = await app.request('/quotas/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing quota', async function () {
      const res = await app.request('/quotas/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent quota', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await app.request('/quotas/550e8400-e29b-41d4-a716-446655440099', {
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

      const res = await app.request('/quotas')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('An unexpected error occurred')
    })
  })
})
