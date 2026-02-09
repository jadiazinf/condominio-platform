import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TCondominium, TCondominiumCreate, TCondominiumUpdate } from '@packages/domain'
import { CondominiumsController } from '@http/controllers/condominiums'
import type { CondominiumsRepository } from '@database/repositories'
import { CondominiumFactory } from '../../setup/factories'
import {
  withId,
  createTestApp,
  getErrorMessage,
  type IApiResponse,
  type IStandardErrorResponse,
} from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockCondominiumsRepository = {
  listAll: () => Promise<TCondominium[]>
  listPaginated: (query: unknown) => Promise<{ data: TCondominium[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>
  getById: (id: string) => Promise<TCondominium | null>
  create: (data: TCondominiumCreate) => Promise<TCondominium>
  update: (id: string, data: TCondominiumUpdate) => Promise<TCondominium | null>
  delete: (id: string) => Promise<boolean>
  getByCode: (code: string) => Promise<TCondominium | null>
}

describe('CondominiumsController', function () {
  let app: Hono
  let mockRepository: TMockCondominiumsRepository
  let testCondominiums: TCondominium[]
  let request: (path: string, options?: RequestInit) => Promise<Response>

  beforeEach(async function () {
    // Create test data
    const condo1 = CondominiumFactory.create({
      name: 'Residencias El Sol',
      code: 'RES-001',
      managementCompanyIds: ['550e8400-e29b-41d4-a716-446655440010'],
      locationId: '550e8400-e29b-41d4-a716-446655440020',
    })
    const condo2 = CondominiumFactory.create({
      name: 'Torre Central',
      code: 'TOR-001',
      managementCompanyIds: ['550e8400-e29b-41d4-a716-446655440010'],
      locationId: '550e8400-e29b-41d4-a716-446655440020',
    })

    testCondominiums = [
      withId(condo1, '550e8400-e29b-41d4-a716-446655440001') as TCondominium,
      withId(condo2, '550e8400-e29b-41d4-a716-446655440002') as TCondominium,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testCondominiums
      },
      listPaginated: async function () {
        return {
          data: testCondominiums,
          pagination: {
            page: 1,
            limit: 20,
            total: testCondominiums.length,
            totalPages: 1,
          },
        }
      },
      getById: async function (id: string) {
        return (
          testCondominiums.find(function (c) {
            return c.id === id
          }) || null
        )
      },
      create: async function (data: TCondominiumCreate) {
        return withId(data, crypto.randomUUID()) as TCondominium
      },
      update: async function (id: string, data: TCondominiumUpdate) {
        const condo = testCondominiums.find(function (c) {
          return c.id === id
        })
        if (!condo) return null
        return { ...condo, ...data } as TCondominium
      },
      delete: async function (id: string) {
        return testCondominiums.some(function (c) {
          return c.id === id
        })
      },
      getByCode: async function (code: string) {
        return (
          testCondominiums.find(function (c) {
            return c.code === code
          }) || null
        )
      },
    }

    // Create mock repositories for other dependencies
    const mockSubscriptionsRepository = {
      getActiveByCompanyId: async () => ({
        maxCondominiums: null,
        maxUnits: null,
        maxUsers: null,
      }),
    } as any
    const mockCompaniesRepository = {
      getById: async () => null,
      getUsageStats: async () => ({
        condominiumsCount: 0,
        unitsCount: 0,
        usersCount: 0,
      }),
    } as any
    const mockLocationsRepository = {
      getById: async () => null,
      getByIdWithHierarchy: async () => null,
    } as any
    const mockCurrenciesRepository = {
      getById: async () => null,
    } as any
    const mockUsersRepository = {
      getById: async () => null,
      checkIsSuperadmin: async () => false,
    } as any
    const mockDb = {} as any

    // Create controller with mock repository
    const controller = new CondominiumsController(
      mockRepository as unknown as CondominiumsRepository,
      mockSubscriptionsRepository,
      mockCompaniesRepository,
      mockLocationsRepository,
      mockCurrenciesRepository,
      mockUsersRepository,
      mockDb
    )

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/condominiums', controller.createRouter())

    // Get auth token

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return the condominium matching the context condominiumId', async function () {
      const res = await request('/condominiums', {
        headers: { 'x-condominium-id': '550e8400-e29b-41d4-a716-446655440001' },
      })
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].name).toBe('Residencias El Sol')
    })

    it('should return 404 when condominiumId not found', async function () {
      const res = await request('/condominiums', {
        headers: { 'x-condominium-id': '550e8400-e29b-41d4-a716-446655440099' },
      })
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return condominium by ID', async function () {
      const res = await request('/condominiums/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Residencias El Sol')
    })

    it('should return 404 when condominium not found', async function () {
      const res = await request('/condominiums/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/condominiums/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /code/:code (getByCode)', function () {
    it('should return condominium by code', async function () {
      const res = await request('/condominiums/code/RES-001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Residencias El Sol')
      expect(json.data.code).toBe('RES-001')
    })

    it('should return 404 when condominium with code not found', async function () {
      const res = await request('/condominiums/code/XXX-999')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toBe('Condominium not found')
    })
  })

  describe('POST / (create)', function () {
    it('should create a new condominium', async function () {
      const newCondo = CondominiumFactory.withManagementCompanies(
        ['550e8400-e29b-41d4-a716-446655440010'],
        { name: 'Nuevo Condominio', code: 'NEW-001' }
      )

      const res = await request('/condominiums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCondo),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Nuevo Condominio')
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body with validation error details', async function () {
      const res = await request('/condominiums', {
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
      expect(json.error.fields!.length).toBeGreaterThan(0)
    })

    it('should return 409 when duplicate condominium exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newCondo = CondominiumFactory.withManagementCompanies(
        ['550e8400-e29b-41d4-a716-446655440010'],
        { code: 'RES-001' }
      )

      const res = await request('/condominiums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCondo),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('already exists')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing condominium', async function () {
      const res = await request('/condominiums/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Residencias El Sol Actualizado' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Residencias El Sol Actualizado')
    })

    it('should return 404 when updating non-existent condominium', async function () {
      const res = await request('/condominiums/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing condominium', async function () {
      const res = await request('/condominiums/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent condominium', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/condominiums/550e8400-e29b-41d4-a716-446655440099', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('Error handling', function () {
    it('should return 500 for unexpected errors', async function () {
      mockRepository.getById = async function () {
        throw new Error('Unexpected database error')
      }

      const res = await request('/condominiums', {
        headers: { 'x-condominium-id': '550e8400-e29b-41d4-a716-446655440001' },
      })
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('unexpected')
    })
  })
})
