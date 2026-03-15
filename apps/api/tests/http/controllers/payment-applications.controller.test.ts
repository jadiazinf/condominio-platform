import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type {
  TPaymentApplication,
  TPaymentApplicationCreate,
  TPaymentApplicationUpdate,
  TPayment,
  TQuota,
} from '@packages/domain'
import { PaymentApplicationsController } from '@http/controllers/payment-applications'
import type {
  PaymentApplicationsRepository,
  PaymentsRepository,
  QuotasRepository,
  QuotaAdjustmentsRepository,
  InterestConfigurationsRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import {
  withId,
  createTestApp,
  getErrorMessage,
  type IApiResponse,
  type IStandardErrorResponse,
} from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// ─────────────────────────────────────────────────────────────────────────────
// Test data
// ─────────────────────────────────────────────────────────────────────────────

const paymentId1 = '550e8400-e29b-41d4-a716-446655440010'
const paymentId2 = '550e8400-e29b-41d4-a716-446655440011'
const quotaId1 = '550e8400-e29b-41d4-a716-446655440020'
const quotaId2 = '550e8400-e29b-41d4-a716-446655440021'
const userId = '550e8400-e29b-41d4-a716-446655440000'

function makePayment(id: string, overrides: Partial<TPayment> = {}): TPayment {
  return {
    id,
    paymentNumber: null,
    userId,
    unitId: '550e8400-e29b-41d4-a716-446655440030',
    amount: '100.00',
    currencyId: '550e8400-e29b-41d4-a716-446655440040',
    paidAmount: null,
    paidCurrencyId: null,
    exchangeRate: null,
    paymentMethod: 'transfer',
    paymentGatewayId: null,
    paymentDetails: null,
    paymentDate: '2025-01-15',
    registeredAt: new Date(),
    status: 'completed',
    receiptUrl: null,
    receiptNumber: null,
    notes: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    registeredBy: userId,
    verifiedBy: null,
    verifiedAt: null,
    verificationNotes: null,
    ...overrides,
  } as TPayment
}

function makeQuota(id: string, overrides: Partial<TQuota> = {}): TQuota {
  return {
    id,
    unitId: '550e8400-e29b-41d4-a716-446655440030',
    paymentConceptId: '550e8400-e29b-41d4-a716-446655440050',
    periodYear: 2025,
    periodMonth: 1,
    periodDescription: null,
    baseAmount: '100.00',
    currencyId: '550e8400-e29b-41d4-a716-446655440040',
    interestAmount: '0',
    amountInBaseCurrency: null,
    exchangeRateUsed: null,
    issueDate: '2025-01-01',
    dueDate: '2025-01-31',
    status: 'pending',
    paidAmount: '0',
    balance: '100.00',
    notes: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: userId,
    ...overrides,
  } as TQuota
}

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

function createMockDb() {
  return {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  } as unknown as TDrizzleClient
}

function createMockPaymentApplicationsRepo(testApplications: TPaymentApplication[]) {
  return {
    listAll: async () => testApplications,
    getById: async (id: string) => testApplications.find(a => a.id === id) || null,
    create: async (data: TPaymentApplicationCreate) => withId(data, crypto.randomUUID()) as TPaymentApplication,
    update: async (id: string, data: TPaymentApplicationUpdate) => {
      const a = testApplications.find(item => item.id === id)
      if (!a) return null
      return { ...a, ...data } as TPaymentApplication
    },
    delete: async (id: string) => testApplications.some(a => a.id === id),
    getByPaymentId: async (paymentId: string) => testApplications.filter(a => a.paymentId === paymentId),
    getByQuotaId: async (quotaId: string) => testApplications.filter(a => a.quotaId === quotaId),
    withTx: function () { return this },
  } as unknown as PaymentApplicationsRepository
}

function createMockPaymentsRepo(payments: TPayment[]) {
  return {
    getById: async (id: string) => payments.find(p => p.id === id) || null,
    withTx: function () { return this },
  } as unknown as PaymentsRepository
}

function createMockQuotasRepo(quotas: TQuota[]) {
  return {
    getById: async (id: string) => quotas.find(q => q.id === id) || null,
    getUnpaidByConceptAndUnit: async () => [],
    update: async () => null,
    withTx: function () { return this },
  } as unknown as QuotasRepository
}

function createMockAdjustmentsRepo() {
  return {
    create: async () => ({}),
    withTx: function () { return this },
  } as unknown as QuotaAdjustmentsRepository
}

function createMockInterestConfigsRepo() {
  return {
    getActiveForDate: async () => null,
    withTx: function () { return this },
  } as unknown as InterestConfigurationsRepository
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('PaymentApplicationsController', function () {
  let app: Hono
  let request: (path: string, options?: RequestInit) => Promise<Response>
  let mockAppsRepo: ReturnType<typeof createMockPaymentApplicationsRepo>
  let testApplications: TPaymentApplication[]

  const testPayments = [
    makePayment(paymentId1),
    makePayment(paymentId2),
  ]

  const testQuotas = [
    makeQuota(quotaId1),
    makeQuota(quotaId2),
  ]

  beforeEach(function () {
    const app1Data: TPaymentApplicationCreate = {
      paymentId: paymentId1, quotaId: quotaId1, appliedAmount: '100.00',
      appliedToPrincipal: '100.00', appliedToInterest: '0', registeredBy: null,
    }
    const app2Data: TPaymentApplicationCreate = {
      paymentId: paymentId1, quotaId: quotaId2, appliedAmount: '50.00',
      appliedToPrincipal: '50.00', appliedToInterest: '0', registeredBy: null,
    }
    const app3Data: TPaymentApplicationCreate = {
      paymentId: paymentId2, quotaId: quotaId1, appliedAmount: '25.00',
      appliedToPrincipal: '25.00', appliedToInterest: '0', registeredBy: null,
    }

    testApplications = [
      withId(app1Data, '550e8400-e29b-41d4-a716-446655440001') as TPaymentApplication,
      withId(app2Data, '550e8400-e29b-41d4-a716-446655440002') as TPaymentApplication,
      withId(app3Data, '550e8400-e29b-41d4-a716-446655440003') as TPaymentApplication,
    ]

    mockAppsRepo = createMockPaymentApplicationsRepo(testApplications)

    const controller = new PaymentApplicationsController(
      mockAppsRepo,
      createMockDb(),
      createMockPaymentsRepo(testPayments),
      createMockQuotasRepo(testQuotas),
      createMockAdjustmentsRepo(),
      createMockInterestConfigsRepo(),
    )

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
      mockAppsRepo.listAll = async () => []
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
      expect(getErrorMessage(json)).toContain('not found')
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
    })

    it('should return empty array when no applications for payment', async function () {
      mockAppsRepo.getByPaymentId = async () => []
      const res = await request('/payment-applications/payment/550e8400-e29b-41d4-a716-446655440099')
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
    })

    it('should return empty array when no applications for quota', async function () {
      mockAppsRepo.getByQuotaId = async () => []
      const res = await request('/payment-applications/quota/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)
      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('POST / (apply payment)', function () {
    it('should apply payment to quota and return 201', async function () {
      const res = await request('/payment-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: paymentId2,
          quotaId: quotaId2,
          appliedAmount: '75.00',
        }),
      })

      expect(res.status).toBe(StatusCodes.CREATED)
      const json = (await res.json()) as IApiResponse
      expect(json.data.application).toBeDefined()
      expect(json.data.quotaUpdated).toBe(true)
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/payment-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: 'invalid' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
      const json = (await res.json()) as IStandardErrorResponse
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ErrorCodes.VALIDATION_ERROR)
    })

    it('should return 404 when payment not found', async function () {
      const res = await request('/payment-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: '550e8400-e29b-41d4-a716-446655440099',
          quotaId: quotaId1,
          appliedAmount: '100.00',
        }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })

    it('should return 404 when quota not found', async function () {
      const res = await request('/payment-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: paymentId1,
          quotaId: '550e8400-e29b-41d4-a716-446655440099',
          appliedAmount: '100.00',
        }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })

    it('should return 400 when payment is not completed', async function () {
      const controller = new PaymentApplicationsController(
        mockAppsRepo,
        createMockDb(),
        createMockPaymentsRepo([makePayment(paymentId1, { status: 'pending' })]),
        createMockQuotasRepo(testQuotas),
        createMockAdjustmentsRepo(),
        createMockInterestConfigsRepo(),
      )
      const testApp = createTestApp()
      testApp.route('/pa', controller.createRouter())

      const res = await testApp.request('/pa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: paymentId1,
          quotaId: quotaId1,
          appliedAmount: '100.00',
        }),
      })

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })

    it('should return 400 when older unpaid quotas exist for the same concept', async function () {
      const olderQuota = makeQuota('550e8400-e29b-41d4-a716-446655440025', {
        dueDate: '2024-12-31',
        periodYear: 2024,
        periodMonth: 12,
        status: 'overdue',
      })
      const newerQuota = makeQuota(quotaId2, {
        dueDate: '2025-02-28',
        periodYear: 2025,
        periodMonth: 2,
      })

      const mockQuotasWithOlder = createMockQuotasRepo([olderQuota, newerQuota])
      // Override to return the older quota as unpaid
      mockQuotasWithOlder.getUnpaidByConceptAndUnit = async () => [olderQuota, newerQuota]

      const controller = new PaymentApplicationsController(
        mockAppsRepo,
        createMockDb(),
        createMockPaymentsRepo(testPayments),
        mockQuotasWithOlder,
        createMockAdjustmentsRepo(),
        createMockInterestConfigsRepo(),
      )
      const testApp = createTestApp()
      testApp.route('/pa', controller.createRouter())

      const res = await testApp.request('/pa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: paymentId1,
          quotaId: quotaId2,
          appliedAmount: '50.00',
        }),
      })

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
      const json = (await res.json()) as IApiResponse
      expect(json.error).toContain('cuota(s) anteriores pendientes')
    })

    it('should allow payment when target quota is the oldest unpaid', async function () {
      const oldestQuota = makeQuota(quotaId1, {
        dueDate: '2025-01-31',
        periodYear: 2025,
        periodMonth: 1,
      })

      const mockQuotasOldest = createMockQuotasRepo([oldestQuota])
      mockQuotasOldest.getUnpaidByConceptAndUnit = async () => [oldestQuota]

      const controller = new PaymentApplicationsController(
        createMockPaymentApplicationsRepo([]),
        createMockDb(),
        createMockPaymentsRepo(testPayments),
        mockQuotasOldest,
        createMockAdjustmentsRepo(),
        createMockInterestConfigsRepo(),
      )
      const testApp = createTestApp()
      testApp.route('/pa', controller.createRouter())

      const res = await testApp.request('/pa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: paymentId1,
          quotaId: quotaId1,
          appliedAmount: '50.00',
        }),
      })

      expect(res.status).toBe(StatusCodes.CREATED)
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
      mockAppsRepo.delete = async () => false
      const res = await request('/payment-applications/550e8400-e29b-41d4-a716-446655440099', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)
    })
  })

  describe('Error handling', function () {
    it('should return 500 for unexpected errors', async function () {
      mockAppsRepo.listAll = async () => { throw new Error('Unexpected database error') }
      const res = await request('/payment-applications')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('unexpected')
    })
  })
})
