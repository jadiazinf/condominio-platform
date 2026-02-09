import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type {
  TPaymentConcept,
  TPaymentConceptCreate,
  TPaymentConceptUpdate,
} from '@packages/domain'
import { PaymentConceptsController } from '@http/controllers/payment-concepts'
import type { PaymentConceptsRepository } from '@database/repositories'
import {
  withId,
  createTestApp,
  getErrorMessage,
  type IApiResponse,
  type IStandardErrorResponse,
} from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockPaymentConceptsRepository = {
  listAll: () => Promise<TPaymentConcept[]>
  getById: (id: string) => Promise<TPaymentConcept | null>
  create: (data: TPaymentConceptCreate) => Promise<TPaymentConcept>
  update: (id: string, data: TPaymentConceptUpdate) => Promise<TPaymentConcept | null>
  delete: (id: string) => Promise<boolean>
  getByCondominiumId: (condominiumId: string) => Promise<TPaymentConcept[]>
  getByBuildingId: (buildingId: string) => Promise<TPaymentConcept[]>
  getRecurringConcepts: () => Promise<TPaymentConcept[]>
  getByConceptType: (conceptType: string) => Promise<TPaymentConcept[]>
}

function createPaymentConcept(
  overrides: Partial<TPaymentConceptCreate> = {}
): TPaymentConceptCreate {
  return {
    name: 'Monthly Maintenance',
    description: 'Monthly maintenance fee',
    conceptType: 'maintenance',
    condominiumId: null,
    buildingId: null,
    currencyId: '550e8400-e29b-41d4-a716-446655440050',
    isRecurring: true,
    recurrencePeriod: 'monthly',
    isActive: true,
    metadata: null,
    createdBy: null,
    ...overrides,
  }
}

describe('PaymentConceptsController', function () {
  let app: Hono
  let request: (path: string, options?: RequestInit) => Promise<Response>
  let mockRepository: TMockPaymentConceptsRepository
  let testPaymentConcepts: TPaymentConcept[]

  const condominiumId = '550e8400-e29b-41d4-a716-446655440010'
  const buildingId = '550e8400-e29b-41d4-a716-446655440011'

  beforeEach(function () {
    // Create test data
    const concept1 = createPaymentConcept({
      name: 'Monthly Maintenance',
      condominiumId,
      isRecurring: true,
    })
    const concept2 = createPaymentConcept({
      name: 'Parking Fee',
      buildingId,
      conceptType: 'other',
      isRecurring: true,
    })
    const concept3 = createPaymentConcept({
      name: 'Special Assessment',
      conceptType: 'extraordinary',
      isRecurring: false,
    })

    testPaymentConcepts = [
      withId(concept1, '550e8400-e29b-41d4-a716-446655440001') as TPaymentConcept,
      withId(concept2, '550e8400-e29b-41d4-a716-446655440002') as TPaymentConcept,
      withId(concept3, '550e8400-e29b-41d4-a716-446655440003') as TPaymentConcept,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testPaymentConcepts
      },
      getById: async function (id: string) {
        return (
          testPaymentConcepts.find(function (pc) {
            return pc.id === id
          }) || null
        )
      },
      create: async function (data: TPaymentConceptCreate) {
        return withId(data, crypto.randomUUID()) as TPaymentConcept
      },
      update: async function (id: string, data: TPaymentConceptUpdate) {
        const pc = testPaymentConcepts.find(function (item) {
          return item.id === id
        })
        if (!pc) return null
        return { ...pc, ...data } as TPaymentConcept
      },
      delete: async function (id: string) {
        return testPaymentConcepts.some(function (pc) {
          return pc.id === id
        })
      },
      getByCondominiumId: async function (condominiumId: string) {
        return testPaymentConcepts.filter(function (pc) {
          return pc.condominiumId === condominiumId
        })
      },
      getByBuildingId: async function (buildingId: string) {
        return testPaymentConcepts.filter(function (pc) {
          return pc.buildingId === buildingId
        })
      },
      getRecurringConcepts: async function () {
        return testPaymentConcepts.filter(function (pc) {
          return pc.isRecurring
        })
      },
      getByConceptType: async function (conceptType: string) {
        return testPaymentConcepts.filter(function (pc) {
          return pc.conceptType === conceptType
        })
      },
    }

    // Create controller with mock repository
    const controller = new PaymentConceptsController(
      mockRepository as unknown as PaymentConceptsRepository
    )

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/payment-concepts', controller.createRouter())

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return payment concepts for the given condominium', async function () {
      const res = await request('/payment-concepts', {
        headers: { 'x-condominium-id': condominiumId },
      })
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].condominiumId).toBe(condominiumId)
    })

    it('should return empty array when no payment concepts for condominium', async function () {
      mockRepository.getByCondominiumId = async function () {
        return []
      }

      const res = await request('/payment-concepts', {
        headers: { 'x-condominium-id': '550e8400-e29b-41d4-a716-446655440099' },
      })
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return payment concept by ID', async function () {
      const res = await request('/payment-concepts/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Monthly Maintenance')
    })

    it('should return 404 when payment concept not found', async function () {
      const res = await request('/payment-concepts/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/payment-concepts/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /building/:buildingId (getByBuildingId)', function () {
    it('should return payment concepts by building ID', async function () {
      const res = await request(`/payment-concepts/building/${buildingId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].buildingId).toBe(buildingId)
    })

    it('should return empty array when no concepts for building', async function () {
      mockRepository.getByBuildingId = async function () {
        return []
      }

      const res = await request('/payment-concepts/building/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /recurring (getRecurringConcepts)', function () {
    it('should return recurring payment concepts', async function () {
      const res = await request('/payment-concepts/recurring')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (pc: TPaymentConcept) {
          return pc.isRecurring
        })
      ).toBe(true)
    })

    it('should return empty array when no recurring concepts', async function () {
      mockRepository.getRecurringConcepts = async function () {
        return []
      }

      const res = await request('/payment-concepts/recurring')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /type/:conceptType (getByConceptType)', function () {
    it('should return payment concepts by type', async function () {
      const res = await request('/payment-concepts/type/maintenance')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].conceptType).toBe('maintenance')
    })

    it('should return empty array when no concepts of type', async function () {
      mockRepository.getByConceptType = async function () {
        return []
      }

      const res = await request('/payment-concepts/type/unknown')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new payment concept', async function () {
      const newConcept = createPaymentConcept({ name: 'Water Bill' })

      const res = await request('/payment-concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConcept),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Water Bill')
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/payment-concepts', {
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

    it('should return 409 when duplicate payment concept exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newConcept = createPaymentConcept({ name: 'Monthly Maintenance' })

      const res = await request('/payment-concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConcept),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('already exists')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing payment concept', async function () {
      const res = await request('/payment-concepts/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Updated Name')
    })

    it('should return 404 when updating non-existent concept', async function () {
      const res = await request('/payment-concepts/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing payment concept', async function () {
      const res = await request('/payment-concepts/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent concept', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/payment-concepts/550e8400-e29b-41d4-a716-446655440099', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('Error handling', function () {
    it('should return 500 for unexpected errors', async function () {
      mockRepository.getByCondominiumId = async function () {
        throw new Error('Unexpected database error')
      }

      const res = await request('/payment-concepts', {
        headers: { 'x-condominium-id': condominiumId },
      })
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('unexpected')
    })
  })
})
