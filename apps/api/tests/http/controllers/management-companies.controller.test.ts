import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type {
  TManagementCompany,
  TManagementCompanyCreate,
  TManagementCompanyUpdate,
} from '@packages/domain'
import { ManagementCompaniesController } from '@http/controllers/management-companies'
import type { ManagementCompaniesRepository } from '@database/repositories'
import { ManagementCompanyFactory } from '../../setup/factories'
import {
  withId,
  createTestApp,
  getErrorMessage,
  type IApiResponse,
  type IStandardErrorResponse,
} from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockManagementCompaniesRepository = {
  listAll: () => Promise<TManagementCompany[]>
  getById: (id: string) => Promise<TManagementCompany | null>
  create: (data: TManagementCompanyCreate) => Promise<TManagementCompany>
  update: (id: string, data: TManagementCompanyUpdate) => Promise<TManagementCompany | null>
  delete: (id: string) => Promise<boolean>
  getByTaxIdNumber: (taxIdNumber: string) => Promise<TManagementCompany | null>
  getByLocationId: (locationId: string) => Promise<TManagementCompany[]>
}

describe('ManagementCompaniesController', function () {
  let app: Hono
  let request: (path: string, options?: RequestInit) => Promise<Response>
  let mockRepository: TMockManagementCompaniesRepository
  let testCompanies: TManagementCompany[]

  beforeEach(function () {
    // Create test data
    const company1 = ManagementCompanyFactory.create({
      name: 'Administradora ABC',
      taxIdType: 'J',
      taxIdNumber: '12345678-9',
      locationId: '550e8400-e29b-41d4-a716-446655440010',
    })
    const company2 = ManagementCompanyFactory.create({
      name: 'Gestiones XYZ',
      taxIdType: 'J',
      taxIdNumber: '98765432-1',
      locationId: '550e8400-e29b-41d4-a716-446655440010',
    })

    testCompanies = [
      withId(company1, '550e8400-e29b-41d4-a716-446655440001') as TManagementCompany,
      withId(company2, '550e8400-e29b-41d4-a716-446655440002') as TManagementCompany,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testCompanies
      },
      getById: async function (id: string) {
        return (
          testCompanies.find(function (c) {
            return c.id === id
          }) || null
        )
      },
      create: async function (data: TManagementCompanyCreate) {
        return withId(data, crypto.randomUUID()) as TManagementCompany
      },
      update: async function (id: string, data: TManagementCompanyUpdate) {
        const company = testCompanies.find(function (c) {
          return c.id === id
        })
        if (!company) return null
        return { ...company, ...data } as TManagementCompany
      },
      delete: async function (id: string) {
        return testCompanies.some(function (c) {
          return c.id === id
        })
      },
      getByTaxIdNumber: async function (taxIdNumber: string) {
        return (
          testCompanies.find(function (c) {
            return c.taxIdNumber === taxIdNumber
          }) || null
        )
      },
      getByLocationId: async function (locationId: string) {
        return testCompanies.filter(function (c) {
          return c.locationId === locationId
        })
      },
    }

    // Create controller with mock repository
    const controller = new ManagementCompaniesController(
      mockRepository as unknown as ManagementCompaniesRepository
    )

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/management-companies', controller.createRouter())

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all management companies', async function () {
      const res = await request('/management-companies')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
    })

    it('should return empty array when no companies exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/management-companies')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return company by ID', async function () {
      const res = await request('/management-companies/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Administradora ABC')
    })

    it('should return 404 when company not found', async function () {
      const res = await request('/management-companies/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/management-companies/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /tax-id-number/:taxIdNumber (getByTaxIdNumber)', function () {
    it('should return company by tax ID number', async function () {
      const res = await request('/management-companies/tax-id-number/12345678-9')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Administradora ABC')
      expect(json.data.taxIdNumber).toBe('12345678-9')
    })

    it('should return 404 when company with tax ID number not found', async function () {
      const res = await request('/management-companies/tax-id-number/00000000-0')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toBe('Management company not found')
    })
  })

  describe('GET /location/:locationId (getByLocationId)', function () {
    it('should return companies by location ID', async function () {
      const res = await request(
        '/management-companies/location/550e8400-e29b-41d4-a716-446655440010'
      )
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
    })

    it('should return empty array when no companies for location', async function () {
      mockRepository.getByLocationId = async function () {
        return []
      }

      const res = await request(
        '/management-companies/location/550e8400-e29b-41d4-a716-446655440099'
      )
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })

    it('should return 400 for invalid location UUID format', async function () {
      const res = await request('/management-companies/location/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new management company', async function () {
      const newCompany = ManagementCompanyFactory.create({
        name: 'Nueva Administradora',
        taxIdType: 'J',
        taxIdNumber: '11111111-1',
      })

      const res = await request('/management-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCompany),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Nueva Administradora')
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/management-companies', {
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

    it('should return 409 when duplicate company exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newCompany = ManagementCompanyFactory.create({ taxIdType: 'J', taxIdNumber: '12345678-9' })

      const res = await request('/management-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCompany),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('already exists')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing company', async function () {
      const res = await request('/management-companies/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Administradora ABC Actualizada' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('Administradora ABC Actualizada')
    })

    it('should return 404 when updating non-existent company', async function () {
      const res = await request('/management-companies/550e8400-e29b-41d4-a716-446655440099', {
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
    it('should delete an existing company', async function () {
      const res = await request('/management-companies/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent company', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/management-companies/550e8400-e29b-41d4-a716-446655440099', {
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

      const res = await request('/management-companies')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('unexpected')
    })
  })
})
