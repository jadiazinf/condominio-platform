import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type {
  TQuota,
  TQuotaAdjustment,
  TQuotaAdjustmentCreate,
  TQuotaUpdate,
  TAdjustmentType,
} from '@packages/domain'
import { QuotaAdjustmentsController } from '@http/controllers/quota-adjustments'
import type { QuotasRepository, QuotaAdjustmentsRepository } from '@database/repositories'
import { withId, createTestApp, getErrorMessage, type IApiResponse } from './test-utils'

// Mock db that passes through to the callback with itself as the transaction client
const mockDb = {
  transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(mockDb),
} as never

// Mock repository types
type TMockQuotasRepository = {
  getById: (id: string) => Promise<TQuota | null>
  update: (id: string, data: TQuotaUpdate) => Promise<TQuota | null>
  withTx: (tx: unknown) => TMockQuotasRepository
}

type TMockQuotaAdjustmentsRepository = {
  listAll: () => Promise<TQuotaAdjustment[]>
  getById: (id: string) => Promise<TQuotaAdjustment | null>
  getByQuotaId: (quotaId: string) => Promise<TQuotaAdjustment[]>
  getByCreatedBy: (userId: string) => Promise<TQuotaAdjustment[]>
  getByType: (type: TAdjustmentType) => Promise<TQuotaAdjustment[]>
  create: (data: TQuotaAdjustmentCreate) => Promise<TQuotaAdjustment>
  withTx: (tx: unknown) => TMockQuotaAdjustmentsRepository
}

function createTestQuota(overrides: Partial<TQuota> = {}): TQuota {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    unitId: '550e8400-e29b-41d4-a716-446655440010',
    paymentConceptId: '550e8400-e29b-41d4-a716-446655440020',
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
    periodDescription: 'Monthly maintenance',
    paidAmount: '0',
    balance: '100.00',
    notes: null,
    metadata: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createTestAdjustment(overrides: Partial<TQuotaAdjustment> = {}): TQuotaAdjustment {
  return {
    id: '550e8400-e29b-41d4-a716-446655440100',
    quotaId: '550e8400-e29b-41d4-a716-446655440001',
    previousAmount: '100.00',
    newAmount: '90.00',
    adjustmentType: 'discount',
    reason: 'Test discount reason',
    createdBy: '550e8400-e29b-41d4-a716-446655440099',
    createdAt: new Date(),
    ...overrides,
  }
}

describe('QuotaAdjustmentsController', function () {
  let app: Hono
  let mockQuotasRepository: TMockQuotasRepository
  let mockAdjustmentsRepository: TMockQuotaAdjustmentsRepository
  let testQuota: TQuota
  let testAdjustments: TQuotaAdjustment[]
  let request: (path: string, options?: RequestInit) => Promise<Response>

  const adminUserId = '550e8400-e29b-41d4-a716-446655440099'

  beforeEach(async function () {
    testQuota = createTestQuota()
    testAdjustments = [
      createTestAdjustment({
        id: '550e8400-e29b-41d4-a716-446655440100',
        adjustmentType: 'discount',
      }),
      createTestAdjustment({
        id: '550e8400-e29b-41d4-a716-446655440101',
        adjustmentType: 'increase',
        newAmount: '110.00',
      }),
      createTestAdjustment({
        id: '550e8400-e29b-41d4-a716-446655440102',
        adjustmentType: 'discount',
        createdBy: '550e8400-e29b-41d4-a716-446655440098',
      }),
    ]

    mockQuotasRepository = {
      getById: async function (id: string) {
        return id === testQuota.id ? testQuota : null
      },
      update: async function (id: string, data: TQuotaUpdate) {
        if (id === testQuota.id) {
          return { ...testQuota, ...data } as TQuota
        }
        return null
      },
      withTx() { return this },
    }

    mockAdjustmentsRepository = {
      listAll: async function () {
        return testAdjustments
      },
      getById: async function (id: string) {
        return testAdjustments.find(a => a.id === id) || null
      },
      getByQuotaId: async function (quotaId: string) {
        return testAdjustments.filter(a => a.quotaId === quotaId)
      },
      getByCreatedBy: async function (userId: string) {
        return testAdjustments.filter(a => a.createdBy === userId)
      },
      getByType: async function (type: TAdjustmentType) {
        return testAdjustments.filter(a => a.adjustmentType === type)
      },
      create: async function (data: TQuotaAdjustmentCreate) {
        return withId(data, crypto.randomUUID()) as TQuotaAdjustment
      },
      withTx() { return this },
    }

    const controller = new QuotaAdjustmentsController(
      mockDb,
      mockQuotasRepository as unknown as QuotasRepository,
      mockAdjustmentsRepository as unknown as QuotaAdjustmentsRepository
    )

    app = createTestApp()
    app.route('/quota-adjustments', controller.createRouter())

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all adjustments', async function () {
      const res = await request('/quota-adjustments')
      const json = (await res.json()) as IApiResponse

      expect(res.status).toBe(StatusCodes.OK)
      expect(json.data).toHaveLength(3)
    })
  })

  describe('GET /:id', function () {
    it('should return adjustment by id', async function () {
      const res = await request('/quota-adjustments/550e8400-e29b-41d4-a716-446655440100')
      const json = (await res.json()) as IApiResponse

      expect(res.status).toBe(StatusCodes.OK)
      expect(json.data.id).toBe('550e8400-e29b-41d4-a716-446655440100')
      expect(json.data.adjustmentType).toBe('discount')
    })

    it('should return 404 for non-existent adjustment', async function () {
      const res = await request('/quota-adjustments/00000000-0000-0000-0000-000000000000')
      const json = (await res.json()) as IApiResponse

      expect(res.status).toBe(StatusCodes.NOT_FOUND)
      expect(json.error).toBeDefined()
    })

    it('should return 400 for invalid UUID', async function () {
      const res = await request('/quota-adjustments/invalid-id')

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /quota/:quotaId', function () {
    it('should return adjustments for a quota', async function () {
      const res = await request(`/quota-adjustments/quota/${testQuota.id}`)
      const json = (await res.json()) as IApiResponse

      expect(res.status).toBe(StatusCodes.OK)
      expect(json.data).toHaveLength(3)
      expect(json.data.every((a: TQuotaAdjustment) => a.quotaId === testQuota.id)).toBe(true)
    })

    it('should return empty array for quota with no adjustments', async function () {
      mockAdjustmentsRepository.getByQuotaId = async () => []

      const res = await request('/quota-adjustments/quota/550e8400-e29b-41d4-a716-446655440999')
      const json = (await res.json()) as IApiResponse

      expect(res.status).toBe(StatusCodes.OK)
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /user/:userId', function () {
    it('should return adjustments created by a user', async function () {
      const res = await request(`/quota-adjustments/user/${adminUserId}`)
      const json = (await res.json()) as IApiResponse

      expect(res.status).toBe(StatusCodes.OK)
      expect(json.data).toHaveLength(2)
      expect(json.data.every((a: TQuotaAdjustment) => a.createdBy === adminUserId)).toBe(true)
    })
  })

  describe('GET /type/:type', function () {
    it('should return adjustments by type', async function () {
      const res = await request('/quota-adjustments/type/discount')
      const json = (await res.json()) as IApiResponse

      expect(res.status).toBe(StatusCodes.OK)
      expect(json.data).toHaveLength(2)
      expect(json.data.every((a: TQuotaAdjustment) => a.adjustmentType === 'discount')).toBe(true)
    })

    it('should return 400 for invalid adjustment type', async function () {
      const res = await request('/quota-adjustments/type/invalid-type')

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('POST /quota/:quotaId (adjust quota)', function () {
    it('should create a discount adjustment', async function () {
      const res = await request(`/quota-adjustments/quota/${testQuota.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newAmount: '90.00',
          adjustmentType: 'discount',
          reason: 'Discount for early payment applied',
        }),
      })
      const json = (await res.json()) as IApiResponse

      expect(res.status).toBe(StatusCodes.CREATED)
      expect(json.data).toBeDefined()
      expect(json.data.adjustmentType).toBe('discount')
      expect(json.data.newAmount).toBe('90.00')
      expect(json.message).toContain('Quota adjusted')
    })

    it('should create an increase adjustment', async function () {
      const res = await request(`/quota-adjustments/quota/${testQuota.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newAmount: '110.00',
          adjustmentType: 'increase',
          reason: 'Increase due to inflation adjustment',
        }),
      })
      const json = (await res.json()) as IApiResponse

      expect(res.status).toBe(StatusCodes.CREATED)
      expect(json.data.adjustmentType).toBe('increase')
    })

    it('should return 404 for non-existent quota', async function () {
      const res = await request('/quota-adjustments/quota/00000000-0000-0000-0000-000000000000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newAmount: '90.00',
          adjustmentType: 'discount',
          reason: 'Discount for early payment applied',
        }),
      })
      const json = (await res.json()) as IApiResponse

      expect(res.status).toBe(StatusCodes.NOT_FOUND)
      expect(json.error).toContain('not found')
    })

    it('should return 400 when new amount equals current amount', async function () {
      const res = await request(`/quota-adjustments/quota/${testQuota.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newAmount: '100.00', // Same as current
          adjustmentType: 'discount',
          reason: 'Test reason with enough characters',
        }),
      })
      const json = (await res.json()) as IApiResponse

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
      expect(json.error).toContain('different')
    })

    it('should return 400 for cancelled quota', async function () {
      testQuota.status = 'cancelled'

      const res = await request(`/quota-adjustments/quota/${testQuota.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newAmount: '90.00',
          adjustmentType: 'discount',
          reason: 'Discount for early payment applied',
        }),
      })
      const json = (await res.json()) as IApiResponse

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
      expect(json.error).toContain('cancelled')
    })

    it('should return 422 for reason too short', async function () {
      const res = await request(`/quota-adjustments/quota/${testQuota.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newAmount: '90.00',
          adjustmentType: 'discount',
          reason: 'Short', // Less than 10 characters
        }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
    })

    it('should return 400 for waiver with non-zero amount', async function () {
      const res = await request(`/quota-adjustments/quota/${testQuota.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newAmount: '50.00', // Should be 0 for waiver
          adjustmentType: 'waiver',
          reason: 'Waiver applied for special case',
        }),
      })
      const json = (await res.json()) as IApiResponse

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
      expect(json.error).toContain('0')
    })

    it('should successfully apply waiver with zero amount', async function () {
      const res = await request(`/quota-adjustments/quota/${testQuota.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newAmount: '0',
          adjustmentType: 'waiver',
          reason: 'Waiver applied for special situation',
        }),
      })
      const json = (await res.json()) as IApiResponse

      expect(res.status).toBe(StatusCodes.CREATED)
      expect(json.data.adjustmentType).toBe('waiver')
      expect(json.data.newAmount).toBe('0')
    })
  })
})
