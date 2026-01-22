import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type {
  TExpenseCategory,
  TExpenseCategoryCreate,
  TExpenseCategoryUpdate,
} from '@packages/domain'
import { ExpenseCategoriesController } from '@http/controllers/expense-categories'
import type { ExpenseCategoriesRepository } from '@database/repositories'
import { ExpenseCategoryFactory } from '../../setup/factories'
import { withId, createTestApp, getErrorMessage, type IApiResponse, type IStandardErrorResponse } from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockExpenseCategoriesRepository = {
  listAll: () => Promise<TExpenseCategory[]>
  getById: (id: string) => Promise<TExpenseCategory | null>
  create: (data: TExpenseCategoryCreate) => Promise<TExpenseCategory>
  update: (id: string, data: TExpenseCategoryUpdate) => Promise<TExpenseCategory | null>
  delete: (id: string) => Promise<boolean>
  getRootCategories: () => Promise<TExpenseCategory[]>
  getByParentId: (parentCategoryId: string) => Promise<TExpenseCategory[]>
}

describe('ExpenseCategoriesController', function () {
  let app: Hono
  let request: (path: string, options?: RequestInit) => Promise<Response>
  let mockRepository: TMockExpenseCategoriesRepository
  let testCategories: TExpenseCategory[]

  const parentCategoryId = '550e8400-e29b-41d4-a716-446655440001'

  beforeEach(function () {
    // Create test data using factory
    const maintenance = ExpenseCategoryFactory.maintenance()
    const services = ExpenseCategoryFactory.services()
    const subCategory = ExpenseCategoryFactory.child(parentCategoryId, { name: 'Plumbing' })

    testCategories = [
      withId(maintenance, parentCategoryId) as TExpenseCategory,
      withId(services, '550e8400-e29b-41d4-a716-446655440002') as TExpenseCategory,
      withId(subCategory, '550e8400-e29b-41d4-a716-446655440003') as TExpenseCategory,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testCategories
      },
      getById: async function (id: string) {
        return (
          testCategories.find(function (c) {
            return c.id === id
          }) || null
        )
      },
      create: async function (data: TExpenseCategoryCreate) {
        return withId(data, crypto.randomUUID()) as TExpenseCategory
      },
      update: async function (id: string, data: TExpenseCategoryUpdate) {
        const c = testCategories.find(function (item) {
          return item.id === id
        })
        if (!c) return null
        return { ...c, ...data } as TExpenseCategory
      },
      delete: async function (id: string) {
        return testCategories.some(function (c) {
          return c.id === id
        })
      },
      getRootCategories: async function () {
        return testCategories.filter(function (c) {
          return !c.parentCategoryId
        })
      },
      getByParentId: async function (parentCategoryId: string) {
        return testCategories.filter(function (c) {
          return c.parentCategoryId === parentCategoryId
        })
      },
    }

    // Create controller with mock repository
    const controller = new ExpenseCategoriesController(
      mockRepository as unknown as ExpenseCategoriesRepository
    )

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/expense-categories', controller.createRouter())

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all expense categories', async function () {
      const res = await request('/expense-categories')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no categories exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/expense-categories')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return category by ID', async function () {
      const res = await request(`/expense-categories/${parentCategoryId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Maintenance')
    })

    it('should return 404 when category not found', async function () {
      const res = await request('/expense-categories/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/expense-categories/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /root (getRootCategories)', function () {
    it('should return root categories only', async function () {
      const res = await request('/expense-categories/root')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (c: TExpenseCategory) {
          return !c.parentCategoryId
        })
      ).toBe(true)
    })

    it('should return empty array when no root categories', async function () {
      mockRepository.getRootCategories = async function () {
        return []
      }

      const res = await request('/expense-categories/root')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /parent/:parentCategoryId (getByParentId)', function () {
    it('should return child categories', async function () {
      const res = await request(`/expense-categories/parent/${parentCategoryId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].parentCategoryId).toBe(parentCategoryId)
    })

    it('should return empty array when no children', async function () {
      mockRepository.getByParentId = async function () {
        return []
      }

      const res = await request('/expense-categories/parent/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new expense category', async function () {
      const newCategory = ExpenseCategoryFactory.administrative()

      const res = await request('/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Administrative')
      expect(json.data.id).toBeDefined()
    })

    it('should create a child category', async function () {
      const newCategory = ExpenseCategoryFactory.child(parentCategoryId, { name: 'Electrical' })

      const res = await request('/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Electrical')
      expect(json.data.parentCategoryId).toBe(parentCategoryId)
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)

      const json = (await res.json()) as IStandardErrorResponse
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ErrorCodes.VALIDATION_ERROR)
      expect(json.error.message).toBeDefined()
      expect(json.error.fields).toBeDefined()
      expect(Array.isArray(json.error.fields)).toBe(true)
    })

    it('should return 409 when duplicate category exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newCategory = ExpenseCategoryFactory.maintenance()

      const res = await request('/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('already exists')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing category', async function () {
      const res = await request(`/expense-categories/${parentCategoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Updated description' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.description).toBe('Updated description')
    })

    it('should return 404 when updating non-existent category', async function () {
      const res = await request('/expense-categories/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Updated' }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing category', async function () {
      const res = await request(`/expense-categories/${parentCategoryId}`, {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent category', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/expense-categories/550e8400-e29b-41d4-a716-446655440099', {
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

      const res = await request('/expense-categories')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('unexpected')
    })
  })
})
