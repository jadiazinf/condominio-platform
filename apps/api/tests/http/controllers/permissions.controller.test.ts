import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TPermission, TPermissionCreate, TPermissionUpdate } from '@packages/domain'
import { PermissionsController } from '@http/controllers/permissions'
import type { PermissionsRepository } from '@database/repositories'
import { PermissionFactory } from '../../setup/factories'
import { withId, createTestApp, getErrorMessage, type IApiResponse, type IStandardErrorResponse } from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockPermissionsRepository = {
  listAll: () => Promise<TPermission[]>
  getById: (id: string) => Promise<TPermission | null>
  create: (data: TPermissionCreate) => Promise<TPermission>
  update: (id: string, data: TPermissionUpdate) => Promise<TPermission | null>
  delete: (id: string) => Promise<boolean>
  getByModule: (module: string) => Promise<TPermission[]>
  getByModuleAndAction: (module: string, action: string) => Promise<TPermission | null>
}

describe('PermissionsController', function () {
  let app: Hono
  let mockRepository: TMockPermissionsRepository
  let testPermissions: TPermission[]
  let request: (path: string, options?: RequestInit) => Promise<Response>

  beforeEach(async function () {
    // Create test data
    const readUsers = PermissionFactory.create({
      name: 'users.read',
      module: 'users',
      action: 'read',
    })
    const writeUsers = PermissionFactory.create({
      name: 'users.create',
      module: 'users',
      action: 'create',
    })
    const readRoles = PermissionFactory.create({
      name: 'units.read',
      module: 'units',
      action: 'read',
    })

    testPermissions = [
      withId(readUsers, '550e8400-e29b-41d4-a716-446655440001') as TPermission,
      withId(writeUsers, '550e8400-e29b-41d4-a716-446655440002') as TPermission,
      withId(readRoles, '550e8400-e29b-41d4-a716-446655440003') as TPermission,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testPermissions
      },
      getById: async function (id: string) {
        return (
          testPermissions.find(function (p) {
            return p.id === id
          }) || null
        )
      },
      create: async function (data: TPermissionCreate) {
        return withId(data, crypto.randomUUID()) as TPermission
      },
      update: async function (id: string, data: TPermissionUpdate) {
        const permission = testPermissions.find(function (p) {
          return p.id === id
        })
        if (!permission) return null
        return { ...permission, ...data } as TPermission
      },
      delete: async function (id: string) {
        return testPermissions.some(function (p) {
          return p.id === id
        })
      },
      getByModule: async function (module: string) {
        return testPermissions.filter(function (p) {
          return p.module === module
        })
      },
      getByModuleAndAction: async function (module: string, action: string) {
        return (
          testPermissions.find(function (p) {
            return p.module === module && p.action === action
          }) || null
        )
      },
    }

    // Create controller with mock repository
    const controller = new PermissionsController(mockRepository as unknown as PermissionsRepository)

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/permissions', controller.createRouter())

    // Get auth token

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all permissions', async function () {
      const res = await request('/permissions')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no permissions exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/permissions')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return permission by ID', async function () {
      const res = await request('/permissions/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('users.read')
    })

    it('should return 404 when permission not found', async function () {
      const res = await request('/permissions/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/permissions/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /module/:module (getByModule)', function () {
    it('should return permissions by module', async function () {
      const res = await request('/permissions/module/users')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (p: TPermission) {
          return p.module === 'users'
        })
      ).toBe(true)
    })

    it('should return empty array when no permissions for module', async function () {
      const res = await request('/permissions/module/unknown')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /module/:module/action/:action (getByModuleAndAction)', function () {
    it('should return permission by module and action', async function () {
      const res = await request('/permissions/module/users/action/read')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.module).toBe('users')
      expect(json.data.action).toBe('read')
    })

    it('should return 404 when permission not found', async function () {
      const res = await request('/permissions/module/users/action/delete')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toBe('Permission not found')
    })
  })

  describe('POST / (create)', function () {
    it('should create a new permission', async function () {
      const newPermission = PermissionFactory.create({
        name: 'users.delete',
        module: 'users',
        action: 'delete',
      })

      const res = await request('/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPermission),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.name).toBe('users.delete')
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/permissions', {
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

    it('should return 409 when duplicate permission exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newPermission = PermissionFactory.create({ name: 'users.read' })

      const res = await request('/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPermission),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('already exists')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing permission', async function () {
      const res = await request('/permissions/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Updated description' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.description).toBe('Updated description')
    })

    it('should return 404 when updating non-existent permission', async function () {
      const res = await request('/permissions/550e8400-e29b-41d4-a716-446655440099', {
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
    it('should delete an existing permission', async function () {
      const res = await request('/permissions/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent permission', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/permissions/550e8400-e29b-41d4-a716-446655440099', {
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

      const res = await request('/permissions')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('unexpected')
    })
  })
})
