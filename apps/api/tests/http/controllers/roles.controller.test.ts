import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TRole, TRoleCreate, TRoleUpdate } from '@packages/domain'
import { RolesController } from '@http/controllers/roles'
import type { RolesRepository } from '@database/repositories'
import { RoleFactory } from '../../setup/factories'
import {
  withId,
  createTestApp,
  getErrorMessage,
  type IApiResponse,
  type IStandardErrorResponse,
} from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockRolesRepository = {
  listAll: () => Promise<TRole[]>
  getById: (id: string) => Promise<TRole | null>
  create: (data: TRoleCreate) => Promise<TRole>
  update: (id: string, data: TRoleUpdate) => Promise<TRole | null>
  delete: (id: string) => Promise<boolean>
  getByName: (name: string) => Promise<TRole | null>
  getSystemRoles: () => Promise<TRole[]>
}

describe('RolesController', function () {
  let app: Hono
  let mockRepository: TMockRolesRepository
  let testRoles: TRole[]
  let request: (path: string, options?: RequestInit) => Promise<Response>

  beforeEach(async function () {
    // Create test data
    const adminRole = RoleFactory.systemRole({ name: 'admin', description: 'Administrator role' })
    const userRole = RoleFactory.create({ name: 'user', description: 'Standard user role' })

    testRoles = [
      withId(adminRole, '550e8400-e29b-41d4-a716-446655440001') as TRole,
      withId(userRole, '550e8400-e29b-41d4-a716-446655440002') as TRole,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testRoles
      },
      getById: async function (id: string) {
        return (
          testRoles.find(function (r) {
            return r.id === id
          }) || null
        )
      },
      create: async function (data: TRoleCreate) {
        return withId(data, crypto.randomUUID()) as TRole
      },
      update: async function (id: string, data: TRoleUpdate) {
        const role = testRoles.find(function (r) {
          return r.id === id
        })
        if (!role) return null
        return { ...role, ...data } as TRole
      },
      delete: async function (id: string) {
        return testRoles.some(function (r) {
          return r.id === id
        })
      },
      getByName: async function (name: string) {
        return (
          testRoles.find(function (r) {
            return r.name === name
          }) || null
        )
      },
      getSystemRoles: async function () {
        return testRoles.filter(function (r) {
          return r.isSystemRole
        })
      },
    }

    // Create controller with mock repository
    const controller = new RolesController(mockRepository as unknown as RolesRepository)

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/roles', controller.createRouter())

    // Get auth token

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all roles', async function () {
      const res = await request('/roles')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
    })

    it('should return empty array when no roles exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/roles')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return role by ID', async function () {
      const res = await request('/roles/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('admin')
    })

    it('should return 404 when role not found', async function () {
      const res = await request('/roles/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/roles/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /name/:name (getByName)', function () {
    it('should return role by name', async function () {
      const res = await request('/roles/name/admin')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('admin')
      expect(json.data.description).toBe('Administrator role')
    })

    it('should return 404 when role with name not found', async function () {
      const res = await request('/roles/name/superadmin')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toBe('Role not found')
    })
  })

  describe('GET /system (getSystemRoles)', function () {
    it('should return system roles only', async function () {
      const res = await request('/roles/system')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].name).toBe('admin')
      expect(json.data[0].isSystemRole).toBe(true)
    })

    it('should return empty array when no system roles exist', async function () {
      mockRepository.getSystemRoles = async function () {
        return []
      }

      const res = await request('/roles/system')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new role', async function () {
      const newRole = RoleFactory.create({ name: 'moderator', description: 'Moderator role' })

      const res = await request('/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRole),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('moderator')
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/roles', {
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

    it('should return 409 when duplicate role exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newRole = RoleFactory.create({ name: 'admin' })

      const res = await request('/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRole),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('already exists')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing role', async function () {
      const res = await request('/roles/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Updated administrator role' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.description).toBe('Updated administrator role')
    })

    it('should return 404 when updating non-existent role', async function () {
      const res = await request('/roles/550e8400-e29b-41d4-a716-446655440099', {
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
    it('should delete an existing role', async function () {
      const res = await request('/roles/550e8400-e29b-41d4-a716-446655440002', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent role', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/roles/550e8400-e29b-41d4-a716-446655440099', {
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

      const res = await request('/roles')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('unexpected')
    })
  })
})
