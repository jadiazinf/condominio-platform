import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TPayment, TPaymentCreate, TPaymentUpdate } from '@packages/domain'
import { PaymentsController } from '@http/controllers/payments'
import type { PaymentsRepository } from '@database/repositories'
import { withId, createTestApp, type IApiResponse } from './test-utils'

// Mock repository type with custom methods
type TMockPaymentsRepository = {
  listAll: () => Promise<TPayment[]>
  getById: (id: string) => Promise<TPayment | null>
  create: (data: TPaymentCreate) => Promise<TPayment>
  update: (id: string, data: TPaymentUpdate) => Promise<TPayment | null>
  delete: (id: string) => Promise<boolean>
  getByPaymentNumber: (paymentNumber: string) => Promise<TPayment | null>
  getByUserId: (userId: string) => Promise<TPayment[]>
  getByUnitId: (unitId: string) => Promise<TPayment[]>
  getByStatus: (status: string) => Promise<TPayment[]>
  getByDateRange: (startDate: string, endDate: string) => Promise<TPayment[]>
}

function createPayment(
  userId: string,
  unitId: string,
  overrides: Partial<TPaymentCreate> = {}
): TPaymentCreate {
  return {
    userId,
    unitId,
    paymentNumber: `PAY-${Date.now()}`,
    amount: '150.00',
    currencyId: '550e8400-e29b-41d4-a716-446655440050',
    paidAmount: null,
    paidCurrencyId: null,
    exchangeRate: null,
    paymentMethod: 'transfer',
    paymentGatewayId: null,
    paymentDetails: null,
    paymentDate: new Date().toISOString().split('T')[0] as string,
    status: 'pending',
    receiptUrl: null,
    receiptNumber: null,
    notes: null,
    metadata: null,
    registeredBy: null,
    ...overrides,
  }
}

describe('PaymentsController', function () {
  let app: Hono
  let mockRepository: TMockPaymentsRepository
  let testPayments: TPayment[]

  const userId1 = '550e8400-e29b-41d4-a716-446655440010'
  const userId2 = '550e8400-e29b-41d4-a716-446655440011'
  const unitId1 = '550e8400-e29b-41d4-a716-446655440020'
  const unitId2 = '550e8400-e29b-41d4-a716-446655440021'

  beforeEach(function () {
    // Create test data
    const payment1 = createPayment(userId1, unitId1, {
      paymentNumber: 'PAY-001',
      status: 'pending',
      paymentDate: '2024-01-15',
    })
    const payment2 = createPayment(userId1, unitId1, {
      paymentNumber: 'PAY-002',
      status: 'completed',
      paymentDate: '2024-01-20',
    })
    const payment3 = createPayment(userId2, unitId2, {
      paymentNumber: 'PAY-003',
      status: 'failed',
      paymentDate: '2024-02-01',
    })

    testPayments = [
      withId(payment1, '550e8400-e29b-41d4-a716-446655440001') as TPayment,
      withId(payment2, '550e8400-e29b-41d4-a716-446655440002') as TPayment,
      withId(payment3, '550e8400-e29b-41d4-a716-446655440003') as TPayment,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testPayments
      },
      getById: async function (id: string) {
        return (
          testPayments.find(function (p) {
            return p.id === id
          }) || null
        )
      },
      create: async function (data: TPaymentCreate) {
        return withId(data, crypto.randomUUID()) as TPayment
      },
      update: async function (id: string, data: TPaymentUpdate) {
        const p = testPayments.find(function (item) {
          return item.id === id
        })
        if (!p) return null
        return { ...p, ...data } as TPayment
      },
      delete: async function (id: string) {
        return testPayments.some(function (p) {
          return p.id === id
        })
      },
      getByPaymentNumber: async function (paymentNumber: string) {
        return (
          testPayments.find(function (p) {
            return p.paymentNumber === paymentNumber
          }) || null
        )
      },
      getByUserId: async function (userId: string) {
        return testPayments.filter(function (p) {
          return p.userId === userId
        })
      },
      getByUnitId: async function (unitId: string) {
        return testPayments.filter(function (p) {
          return p.unitId === unitId
        })
      },
      getByStatus: async function (status: string) {
        return testPayments.filter(function (p) {
          return p.status === status
        })
      },
      getByDateRange: async function (startDate: string, endDate: string) {
        return testPayments.filter(function (p) {
          return p.paymentDate >= startDate && p.paymentDate <= endDate
        })
      },
    }

    // Create controller with mock repository
    const controller = new PaymentsController(mockRepository as unknown as PaymentsRepository)

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/payments', controller.createRouter())
  })

  describe('GET / (list)', function () {
    it('should return all payments', async function () {
      const res = await app.request('/payments')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no payments exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await app.request('/payments')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return payment by ID', async function () {
      const res = await app.request('/payments/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.paymentNumber).toBe('PAY-001')
    })

    it('should return 404 when payment not found', async function () {
      const res = await app.request('/payments/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await app.request('/payments/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /number/:paymentNumber (getByPaymentNumber)', function () {
    it('should return payment by payment number', async function () {
      const res = await app.request('/payments/number/PAY-001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.paymentNumber).toBe('PAY-001')
    })

    it('should return 404 when payment number not found', async function () {
      mockRepository.getByPaymentNumber = async function () {
        return null
      }

      const res = await app.request('/payments/number/PAY-999')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Payment not found')
    })
  })

  describe('GET /user/:userId (getByUserId)', function () {
    it('should return payments by user ID', async function () {
      const res = await app.request(`/payments/user/${userId1}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (p: TPayment) {
          return p.userId === userId1
        })
      ).toBe(true)
    })

    it('should return empty array when no payments for user', async function () {
      mockRepository.getByUserId = async function () {
        return []
      }

      const res = await app.request('/payments/user/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /unit/:unitId (getByUnitId)', function () {
    it('should return payments by unit ID', async function () {
      const res = await app.request(`/payments/unit/${unitId1}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (p: TPayment) {
          return p.unitId === unitId1
        })
      ).toBe(true)
    })

    it('should return empty array when no payments for unit', async function () {
      mockRepository.getByUnitId = async function () {
        return []
      }

      const res = await app.request('/payments/unit/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /status/:status (getByStatus)', function () {
    it('should return payments by status', async function () {
      const res = await app.request('/payments/status/pending')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].status).toBe('pending')
    })

    it('should return completed payments', async function () {
      const res = await app.request('/payments/status/completed')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].status).toBe('completed')
    })

    it('should return 400 for invalid status', async function () {
      const res = await app.request('/payments/status/invalid')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /date-range (getByDateRange)', function () {
    it('should return payments by date range', async function () {
      const res = await app.request('/payments/date-range?startDate=2024-01-01&endDate=2024-01-31')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
    })

    it('should return empty array when no payments in range', async function () {
      mockRepository.getByDateRange = async function () {
        return []
      }

      const res = await app.request('/payments/date-range?startDate=2020-01-01&endDate=2020-12-31')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })

    it('should return 400 when dates are missing', async function () {
      const res = await app.request('/payments/date-range')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })

    it('should return 400 for invalid date format', async function () {
      const res = await app.request('/payments/date-range?startDate=invalid&endDate=2024-01-31')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new payment', async function () {
      const newPayment = createPayment(userId2, unitId1, { paymentNumber: 'PAY-004' })

      const res = await app.request('/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayment),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.paymentNumber).toBe('PAY-004')
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await app.request('/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'invalid' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should return 409 when duplicate payment exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newPayment = createPayment(userId1, unitId1, { paymentNumber: 'PAY-001' })

      const res = await app.request('/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayment),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource already exists')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing payment', async function () {
      const res = await app.request('/payments/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.status).toBe('completed')
    })

    it('should return 404 when updating non-existent payment', async function () {
      const res = await app.request('/payments/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing payment', async function () {
      const res = await app.request('/payments/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent payment', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await app.request('/payments/550e8400-e29b-41d4-a716-446655440099', {
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

      const res = await app.request('/payments')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('An unexpected error occurred')
    })
  })
})
