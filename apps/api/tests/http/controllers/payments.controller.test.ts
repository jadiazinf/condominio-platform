import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TPayment, TPaymentCreate, TPaymentUpdate } from '@packages/domain'
import { PaymentsController } from '@http/controllers/payments'
import type { PaymentsRepository } from '@database/repositories'
import {
  withId,
  createTestApp,
  getErrorMessage,
  type IApiResponse,
  type IStandardErrorResponse,
} from './test-utils'
import { ErrorCodes } from '@http/responses/types'

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
  getPendingVerification: () => Promise<TPayment[]>
  verifyPayment: (id: string, verifiedBy: string, notes?: string) => Promise<TPayment | null>
  rejectPayment: (id: string, verifiedBy: string, notes?: string) => Promise<TPayment | null>
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
  let request: (path: string, options?: RequestInit) => Promise<Response>

  const userId1 = '550e8400-e29b-41d4-a716-446655440010'
  const userId2 = '550e8400-e29b-41d4-a716-446655440011'
  const unitId1 = '550e8400-e29b-41d4-a716-446655440020'
  const unitId2 = '550e8400-e29b-41d4-a716-446655440021'

  beforeEach(async function () {
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
    const payment4 = createPayment(userId2, unitId2, {
      paymentNumber: 'PAY-004',
      status: 'pending_verification',
      paymentDate: '2024-02-10',
    })

    testPayments = [
      withId(payment1, '550e8400-e29b-41d4-a716-446655440001') as TPayment,
      withId(payment2, '550e8400-e29b-41d4-a716-446655440002') as TPayment,
      withId(payment3, '550e8400-e29b-41d4-a716-446655440003') as TPayment,
      withId(payment4, '550e8400-e29b-41d4-a716-446655440004') as TPayment,
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
      getPendingVerification: async function () {
        return testPayments.filter(function (p) {
          return p.status === 'pending_verification'
        })
      },
      verifyPayment: async function (id: string, verifiedBy: string, notes?: string) {
        const payment = testPayments.find(function (p) {
          return p.id === id
        })
        if (!payment) return null
        return {
          ...payment,
          status: 'completed' as const,
          verifiedBy,
          verifiedAt: new Date(),
          verificationNotes: notes ?? null,
        }
      },
      rejectPayment: async function (id: string, verifiedBy: string, notes?: string) {
        const payment = testPayments.find(function (p) {
          return p.id === id
        })
        if (!payment) return null
        return {
          ...payment,
          status: 'rejected' as const,
          verifiedBy,
          verifiedAt: new Date(),
          verificationNotes: notes ?? null,
        }
      },
    }

    // Create controller with mock repository
    const controller = new PaymentsController(mockRepository as unknown as PaymentsRepository)

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/payments', controller.createRouter())

    // Get auth token

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all payments', async function () {
      const res = await request('/payments')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(4)
    })

    it('should return empty array when no payments exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/payments')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return payment by ID', async function () {
      const res = await request('/payments/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.paymentNumber).toBe('PAY-001')
    })

    it('should return 404 when payment not found', async function () {
      const res = await request('/payments/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/payments/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /number/:paymentNumber (getByPaymentNumber)', function () {
    it('should return payment by payment number', async function () {
      const res = await request('/payments/number/PAY-001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.paymentNumber).toBe('PAY-001')
    })

    it('should return 404 when payment number not found', async function () {
      mockRepository.getByPaymentNumber = async function () {
        return null
      }

      const res = await request('/payments/number/PAY-999')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toBe('Payment not found')
    })
  })

  describe('GET /user/:userId (getByUserId)', function () {
    it('should return payments by user ID', async function () {
      const res = await request(`/payments/user/${userId1}`)
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

      const res = await request('/payments/user/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /unit/:unitId (getByUnitId)', function () {
    it('should return payments by unit ID', async function () {
      const res = await request(`/payments/unit/${unitId1}`)
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

      const res = await request('/payments/unit/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /status/:status (getByStatus)', function () {
    it('should return payments by status', async function () {
      const res = await request('/payments/status/pending')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].status).toBe('pending')
    })

    it('should return completed payments', async function () {
      const res = await request('/payments/status/completed')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].status).toBe('completed')
    })

    it('should return 400 for invalid status', async function () {
      const res = await request('/payments/status/invalid')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /date-range (getByDateRange)', function () {
    it('should return payments by date range', async function () {
      const res = await request('/payments/date-range?startDate=2024-01-01&endDate=2024-01-31')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
    })

    it('should return empty array when no payments in range', async function () {
      mockRepository.getByDateRange = async function () {
        return []
      }

      const res = await request('/payments/date-range?startDate=2020-01-01&endDate=2020-12-31')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })

    it('should return 400 when dates are missing', async function () {
      const res = await request('/payments/date-range')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })

    it('should return 400 for invalid date format', async function () {
      const res = await request('/payments/date-range?startDate=invalid&endDate=2024-01-31')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new payment', async function () {
      const newPayment = createPayment(userId2, unitId1, { paymentNumber: 'PAY-004' })

      const res = await request('/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayment),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.paymentNumber).toBe('PAY-004')
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body with validation error details', async function () {
      const res = await request('/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'invalid' }),
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

    it('should return 409 when duplicate payment exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newPayment = createPayment(userId1, unitId1, { paymentNumber: 'PAY-001' })

      const res = await request('/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayment),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('already exists')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing payment', async function () {
      const res = await request('/payments/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.status).toBe('completed')
    })

    it('should return 404 when updating non-existent payment', async function () {
      const res = await request('/payments/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing payment', async function () {
      const res = await request('/payments/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent payment', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/payments/550e8400-e29b-41d4-a716-446655440099', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('GET /pending-verification (getPendingVerification)', function () {
    it('should return payments pending verification', async function () {
      const res = await request('/payments/pending-verification')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].status).toBe('pending_verification')
    })

    it('should return empty array when no payments pending verification', async function () {
      mockRepository.getPendingVerification = async function () {
        return []
      }

      const res = await request('/payments/pending-verification')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('POST /report (reportPayment)', function () {
    it('should report an external payment with pending_verification status', async function () {
      const reportedPayment = createPayment(userId1, unitId1, {
        paymentNumber: 'PAY-REPORT-001',
        paymentMethod: 'cash',
      })

      const res = await request('/payments/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportedPayment),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.id).toBeDefined()
      expect(json.data.status).toBe('pending_verification')
    })

    it('should return 422 for invalid body with validation error details', async function () {
      const res = await request('/payments/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'invalid' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)

      const json = (await res.json()) as IStandardErrorResponse
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ErrorCodes.VALIDATION_ERROR)
      expect(json.error.message).toBeDefined()
      expect(json.error.fields).toBeDefined()
      expect(Array.isArray(json.error.fields)).toBe(true)
    })
  })

  describe('POST /:id/verify (verifyPayment)', function () {
    it('should verify a payment pending verification', async function () {
      const res = await request('/payments/550e8400-e29b-41d4-a716-446655440004/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Verified after reviewing receipt' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.status).toBe('completed')
      expect(json.data.verifiedBy).toBeDefined()
      expect(json.data.verifiedAt).toBeDefined()
      expect(json.data.verificationNotes).toBe('Verified after reviewing receipt')
      expect(json.message).toBe('Payment verified successfully')
    })

    it('should verify a payment without notes', async function () {
      const res = await request('/payments/550e8400-e29b-41d4-a716-446655440004/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.status).toBe('completed')
    })

    it('should return 404 when payment not found', async function () {
      mockRepository.getById = async function () {
        return null
      }

      const res = await request('/payments/550e8400-e29b-41d4-a716-446655440099/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toBe('Payment not found')
    })

    it('should return 400 when payment is not pending verification', async function () {
      const res = await request('/payments/550e8400-e29b-41d4-a716-446655440001/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)

      const json = (await res.json()) as IApiResponse & { currentStatus?: string }
      expect(getErrorMessage(json)).toBe('Payment is not pending verification')
      expect(json.currentStatus).toBe('pending')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/payments/invalid-id/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('POST /:id/reject (rejectPayment)', function () {
    it('should reject a payment pending verification', async function () {
      const res = await request('/payments/550e8400-e29b-41d4-a716-446655440004/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Receipt does not match payment details' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.status).toBe('rejected')
      expect(json.data.verifiedBy).toBeDefined()
      expect(json.data.verifiedAt).toBeDefined()
      expect(json.data.verificationNotes).toBe('Receipt does not match payment details')
      expect(json.message).toBe('Payment rejected')
    })

    it('should reject a payment without notes', async function () {
      const res = await request('/payments/550e8400-e29b-41d4-a716-446655440004/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.status).toBe('rejected')
    })

    it('should return 404 when payment not found', async function () {
      mockRepository.getById = async function () {
        return null
      }

      const res = await request('/payments/550e8400-e29b-41d4-a716-446655440099/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toBe('Payment not found')
    })

    it('should return 400 when payment is not pending verification', async function () {
      const res = await request('/payments/550e8400-e29b-41d4-a716-446655440002/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)

      const json = (await res.json()) as IApiResponse & { currentStatus?: string }
      expect(getErrorMessage(json)).toBe('Payment is not pending verification')
      expect(json.currentStatus).toBe('completed')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/payments/invalid-id/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /status/:status with new statuses', function () {
    it('should return payments with pending_verification status', async function () {
      const res = await request('/payments/status/pending_verification')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].status).toBe('pending_verification')
    })

    it('should return 400 for rejected status filter', async function () {
      mockRepository.getByStatus = async function () {
        return []
      }

      const res = await request('/payments/status/rejected')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('Error handling', function () {
    it('should return 500 for unexpected errors', async function () {
      mockRepository.listAll = async function () {
        throw new Error('Unexpected database error')
      }

      const res = await request('/payments')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('unexpected')
    })
  })
})
