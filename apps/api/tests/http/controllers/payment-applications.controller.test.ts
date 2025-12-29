import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type {
  TPaymentApplication,
  TPaymentApplicationCreate,
  TPaymentApplicationUpdate,
} from '@packages/domain'
import { PaymentApplicationsController } from '@http/controllers/payment-applications'
import type { PaymentApplicationsRepository } from '@database/repositories'
import { withId, createTestApp, type IApiResponse } from './test-utils'

// Mock repository type with custom methods
type TMockPaymentApplicationsRepository = {
  listAll: () => Promise<TPaymentApplication[]>
  getById: (id: string) => Promise<TPaymentApplication | null>
  create: (data: TPaymentApplicationCreate) => Promise<TPaymentApplication>
  update: (id: string, data: TPaymentApplicationUpdate) => Promise<TPaymentApplication | null>
  delete: (id: string) => Promise<boolean>
  getByPaymentId: (paymentId: string) => Promise<TPaymentApplication[]>
  getByQuotaId: (quotaId: string) => Promise<TPaymentApplication[]>
}

function createPaymentApplication(
  paymentId: string,
  quotaId: string,
  overrides: Partial<TPaymentApplicationCreate> = {}
): TPaymentApplicationCreate {
  return {
    paymentId,
    quotaId,
    appliedAmount: '100.00',
    appliedToPrincipal: '100.00',
    appliedToInterest: '0',
    registeredBy: null,
    ...overrides,
  }
}

describe('PaymentApplicationsController', function () {
  let app: Hono
  let request: (path: string, options?: RequestInit) => Promise<Response>
  let mockRepository: TMockPaymentApplicationsRepository
  let testApplications: TPaymentApplication[]

  const paymentId1 = '550e8400-e29b-41d4-a716-446655440010'
  const paymentId2 = '550e8400-e29b-41d4-a716-446655440011'
  const quotaId1 = '550e8400-e29b-41d4-a716-446655440020'
  const quotaId2 = '550e8400-e29b-41d4-a716-446655440021'

  beforeEach(function () {
    // Create test data
    const app1 = createPaymentApplication(paymentId1, quotaId1, { appliedAmount: '100.00' })
    const app2 = createPaymentApplication(paymentId1, quotaId2, { appliedAmount: '50.00' })
    const app3 = createPaymentApplication(paymentId2, quotaId1, { appliedAmount: '25.00' })

    testApplications = [
      withId(app1, '550e8400-e29b-41d4-a716-446655440001') as TPaymentApplication,
      withId(app2, '550e8400-e29b-41d4-a716-446655440002') as TPaymentApplication,
      withId(app3, '550e8400-e29b-41d4-a716-446655440003') as TPaymentApplication,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testApplications
      },
      getById: async function (id: string) {
        return (
          testApplications.find(function (a) {
            return a.id === id
          }) || null
        )
      },
      create: async function (data: TPaymentApplicationCreate) {
        return withId(data, crypto.randomUUID()) as TPaymentApplication
      },
      update: async function (id: string, data: TPaymentApplicationUpdate) {
        const a = testApplications.find(function (item) {
          return item.id === id
        })
        if (!a) return null
        return { ...a, ...data } as TPaymentApplication
      },
      delete: async function (id: string) {
        return testApplications.some(function (a) {
          return a.id === id
        })
      },
      getByPaymentId: async function (paymentId: string) {
        return testApplications.filter(function (a) {
          return a.paymentId === paymentId
        })
      },
      getByQuotaId: async function (quotaId: string) {
        return testApplications.filter(function (a) {
          return a.quotaId === quotaId
        })
      },
    }

    // Create controller with mock repository
    const controller = new PaymentApplicationsController(
      mockRepository as unknown as PaymentApplicationsRepository
    )

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/payment-applications', controller.createRouter())

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all payment applications', async function () {
      const res = await request('/payment-applications')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no applications exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/payment-applications')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return payment application by ID', async function () {
      const res = await request('/payment-applications/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.paymentId).toBe(paymentId1)
      expect(json.data.quotaId).toBe(quotaId1)
    })

    it('should return 404 when application not found', async function () {
      const res = await request('/payment-applications/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/payment-applications/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /payment/:paymentId (getByPaymentId)', function () {
    it('should return applications by payment ID', async function () {
      const res = await request(`/payment-applications/payment/${paymentId1}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (a: TPaymentApplication) {
          return a.paymentId === paymentId1
        })
      ).toBe(true)
    })

    it('should return empty array when no applications for payment', async function () {
      mockRepository.getByPaymentId = async function () {
        return []
      }

      const res = await request(
        '/payment-applications/payment/550e8400-e29b-41d4-a716-446655440099'
      )
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /quota/:quotaId (getByQuotaId)', function () {
    it('should return applications by quota ID', async function () {
      const res = await request(`/payment-applications/quota/${quotaId1}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (a: TPaymentApplication) {
          return a.quotaId === quotaId1
        })
      ).toBe(true)
    })

    it('should return empty array when no applications for quota', async function () {
      mockRepository.getByQuotaId = async function () {
        return []
      }

      const res = await request(
        '/payment-applications/quota/550e8400-e29b-41d4-a716-446655440099'
      )
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new payment application', async function () {
      const newApplication = createPaymentApplication(paymentId2, quotaId2)

      const res = await request('/payment-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApplication),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.paymentId).toBe(paymentId2)
      expect(json.data.quotaId).toBe(quotaId2)
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/payment-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: 'invalid' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should return 409 when duplicate application exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newApplication = createPaymentApplication(paymentId1, quotaId1)

      const res = await request('/payment-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApplication),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource already exists')
    })

    it('should return 400 for foreign key violations', async function () {
      mockRepository.create = async function () {
        throw new Error('violates foreign key constraint')
      }

      const newApplication = createPaymentApplication(
        '550e8400-e29b-41d4-a716-446655440099',
        quotaId1
      )

      const res = await request('/payment-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApplication),
      })

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Invalid reference to related resource')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing application', async function () {
      const res = await request('/payment-applications/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appliedAmount: '75.00' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.appliedAmount).toBe('75.00')
    })

    it('should return 404 when updating non-existent application', async function () {
      const res = await request('/payment-applications/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appliedAmount: '75.00' }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing application', async function () {
      const res = await request('/payment-applications/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent application', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/payment-applications/550e8400-e29b-41d4-a716-446655440099', {
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

      const res = await request('/payment-applications')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('An unexpected error occurred')
    })
  })
})
