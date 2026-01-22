import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TExpense, TExpenseCreate, TExpenseUpdate } from '@packages/domain'
import { ExpensesController } from '@http/controllers/expenses'
import type { ExpensesRepository } from '@database/repositories'
import {
  withId,
  createTestApp,
  getErrorMessage,
  type IApiResponse,
  type IStandardErrorResponse,
} from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockExpensesRepository = {
  listAll: () => Promise<TExpense[]>
  getById: (id: string) => Promise<TExpense | null>
  create: (data: TExpenseCreate) => Promise<TExpense>
  update: (id: string, data: TExpenseUpdate) => Promise<TExpense | null>
  delete: (id: string) => Promise<boolean>
  getByCondominiumId: (condominiumId: string) => Promise<TExpense[]>
  getByBuildingId: (buildingId: string) => Promise<TExpense[]>
  getByCategoryId: (categoryId: string) => Promise<TExpense[]>
  getByStatus: (status: string) => Promise<TExpense[]>
  getByDateRange: (startDate: string, endDate: string) => Promise<TExpense[]>
  getPendingApproval: () => Promise<TExpense[]>
}

function createExpense(
  condominiumId: string,
  categoryId: string,
  overrides: Partial<TExpenseCreate> = {}
): TExpenseCreate {
  return {
    condominiumId,
    buildingId: null,
    expenseCategoryId: categoryId,
    description: 'Test expense',
    expenseDate: new Date().toISOString().split('T')[0] as string,
    amount: '500.00',
    currencyId: '550e8400-e29b-41d4-a716-446655440050',
    vendorName: 'Test Vendor',
    vendorTaxId: null,
    invoiceNumber: null,
    invoiceUrl: null,
    status: 'pending',
    approvedBy: null,
    approvedAt: null,
    notes: null,
    metadata: null,
    createdBy: null,
    ...overrides,
  }
}

describe('ExpensesController', function () {
  let app: Hono
  let request: (path: string, options?: RequestInit) => Promise<Response>
  let mockRepository: TMockExpensesRepository
  let testExpenses: TExpense[]

  const condominiumId = '550e8400-e29b-41d4-a716-446655440010'
  const buildingId = '550e8400-e29b-41d4-a716-446655440011'
  const categoryId1 = '550e8400-e29b-41d4-a716-446655440020'
  const categoryId2 = '550e8400-e29b-41d4-a716-446655440021'

  beforeEach(function () {
    // Create test data
    const expense1 = createExpense(condominiumId, categoryId1, {
      status: 'pending',
      expenseDate: '2024-01-15',
    })
    const expense2 = createExpense(condominiumId, categoryId2, {
      buildingId,
      status: 'approved',
      expenseDate: '2024-01-20',
    })
    const expense3 = createExpense(condominiumId, categoryId1, {
      status: 'paid',
      expenseDate: '2024-02-01',
    })

    testExpenses = [
      withId(expense1, '550e8400-e29b-41d4-a716-446655440001') as TExpense,
      withId(expense2, '550e8400-e29b-41d4-a716-446655440002') as TExpense,
      withId(expense3, '550e8400-e29b-41d4-a716-446655440003') as TExpense,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testExpenses
      },
      getById: async function (id: string) {
        return (
          testExpenses.find(function (e) {
            return e.id === id
          }) || null
        )
      },
      create: async function (data: TExpenseCreate) {
        return withId(data, crypto.randomUUID()) as TExpense
      },
      update: async function (id: string, data: TExpenseUpdate) {
        const e = testExpenses.find(function (item) {
          return item.id === id
        })
        if (!e) return null
        return { ...e, ...data } as TExpense
      },
      delete: async function (id: string) {
        return testExpenses.some(function (e) {
          return e.id === id
        })
      },
      getByCondominiumId: async function (condominiumId: string) {
        return testExpenses.filter(function (e) {
          return e.condominiumId === condominiumId
        })
      },
      getByBuildingId: async function (buildingId: string) {
        return testExpenses.filter(function (e) {
          return e.buildingId === buildingId
        })
      },
      getByCategoryId: async function (categoryId: string) {
        return testExpenses.filter(function (e) {
          return e.expenseCategoryId === categoryId
        })
      },
      getByStatus: async function (status: string) {
        return testExpenses.filter(function (e) {
          return e.status === status
        })
      },
      getByDateRange: async function (startDate: string, endDate: string) {
        return testExpenses.filter(function (e) {
          return e.expenseDate >= startDate && e.expenseDate <= endDate
        })
      },
      getPendingApproval: async function () {
        return testExpenses.filter(function (e) {
          return e.status === 'pending'
        })
      },
    }

    // Create controller with mock repository
    const controller = new ExpensesController(mockRepository as unknown as ExpensesRepository)

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/expenses', controller.createRouter())

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all expenses', async function () {
      const res = await request('/expenses')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no expenses exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/expenses')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return expense by ID', async function () {
      const res = await request('/expenses/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.condominiumId).toBe(condominiumId)
      expect(json.data.status).toBe('pending')
    })

    it('should return 404 when expense not found', async function () {
      const res = await request('/expenses/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/expenses/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /pending-approval (getPendingApproval)', function () {
    it('should return expenses pending approval', async function () {
      const res = await request('/expenses/pending-approval')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].status).toBe('pending')
    })

    it('should return empty array when no pending expenses', async function () {
      mockRepository.getPendingApproval = async function () {
        return []
      }

      const res = await request('/expenses/pending-approval')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /condominium/:condominiumId (getByCondominiumId)', function () {
    it('should return expenses by condominium ID', async function () {
      const res = await request(`/expenses/condominium/${condominiumId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no expenses for condominium', async function () {
      mockRepository.getByCondominiumId = async function () {
        return []
      }

      const res = await request('/expenses/condominium/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /building/:buildingId (getByBuildingId)', function () {
    it('should return expenses by building ID', async function () {
      const res = await request(`/expenses/building/${buildingId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].buildingId).toBe(buildingId)
    })

    it('should return empty array when no expenses for building', async function () {
      mockRepository.getByBuildingId = async function () {
        return []
      }

      const res = await request('/expenses/building/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /category/:categoryId (getByCategoryId)', function () {
    it('should return expenses by category ID', async function () {
      const res = await request(`/expenses/category/${categoryId1}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
    })

    it('should return empty array when no expenses for category', async function () {
      mockRepository.getByCategoryId = async function () {
        return []
      }

      const res = await request('/expenses/category/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /status/:status (getByStatus)', function () {
    it('should return expenses by status', async function () {
      const res = await request('/expenses/status/pending')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].status).toBe('pending')
    })

    it('should return 400 for invalid status', async function () {
      const res = await request('/expenses/status/invalid')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /date-range (getByDateRange)', function () {
    it('should return expenses by date range', async function () {
      const res = await request('/expenses/date-range?startDate=2024-01-01&endDate=2024-01-31')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
    })

    it('should return 400 when dates are missing', async function () {
      const res = await request('/expenses/date-range')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new expense', async function () {
      const newExpense = createExpense(condominiumId, categoryId2, { description: 'New expense' })

      const res = await request('/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.description).toBe('New expense')
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condominiumId: 'invalid' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)

      const json = (await res.json()) as IStandardErrorResponse
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ErrorCodes.VALIDATION_ERROR)
      expect(json.error.message).toBeDefined()
      expect(json.error.fields).toBeDefined()
      expect(Array.isArray(json.error.fields)).toBe(true)
    })

    it('should return 400 for foreign key violations', async function () {
      mockRepository.create = async function () {
        throw new Error('violates foreign key constraint')
      }

      const newExpense = createExpense('550e8400-e29b-41d4-a716-446655440099', categoryId1)

      const res = await request('/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense),
      })

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('reference')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing expense', async function () {
      const res = await request('/expenses/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.status).toBe('approved')
    })

    it('should return 404 when updating non-existent expense', async function () {
      const res = await request('/expenses/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing expense', async function () {
      const res = await request('/expenses/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent expense', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/expenses/550e8400-e29b-41d4-a716-446655440099', {
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

      const res = await request('/expenses')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('unexpected')
    })
  })
})
