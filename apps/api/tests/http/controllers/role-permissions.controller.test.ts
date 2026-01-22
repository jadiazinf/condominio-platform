import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type {
  TRolePermission,
  TRolePermissionCreate,
  TRolePermissionUpdate,
} from '@packages/domain'
import { RolePermissionsController } from '@http/controllers/role-permissions'
import type { RolePermissionsRepository } from '@database/repositories'
import { withId, createTestApp, getErrorMessage, type IApiResponse, type IStandardErrorResponse } from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockRolePermissionsRepository = {
  listAll: () => Promise<TRolePermission[]>
  getById: (id: string) => Promise<TRolePermission | null>
  create: (data: TRolePermissionCreate) => Promise<TRolePermission>
  update: (id: string, data: TRolePermissionUpdate) => Promise<TRolePermission | null>
  delete: (id: string) => Promise<boolean>
  getByRoleId: (roleId: string) => Promise<TRolePermission[]>
  getByPermissionId: (permissionId: string) => Promise<TRolePermission[]>
  exists: (roleId: string, permissionId: string) => Promise<boolean>
  removeByRoleAndPermission: (roleId: string, permissionId: string) => Promise<boolean>
}

function createRolePermission(
  roleId: string,
  permissionId: string,
  overrides: Partial<TRolePermissionCreate> = {}
): TRolePermissionCreate {
  return {
    roleId,
    permissionId,
    registeredBy: null,
    ...overrides,
  }
}

describe('RolePermissionsController', function () {
  let app: Hono
  let mockRepository: TMockRolePermissionsRepository
  let testRolePermissions: TRolePermission[]
  let request: (path: string, options?: RequestInit) => Promise<Response>

  const roleId1 = '550e8400-e29b-41d4-a716-446655440010'
  const roleId2 = '550e8400-e29b-41d4-a716-446655440011'
  const permissionId1 = '550e8400-e29b-41d4-a716-446655440020'
  const permissionId2 = '550e8400-e29b-41d4-a716-446655440021'

  beforeEach(async function () {
    // Create test data
    const rp1 = createRolePermission(roleId1, permissionId1)
    const rp2 = createRolePermission(roleId1, permissionId2)
    const rp3 = createRolePermission(roleId2, permissionId1)

    testRolePermissions = [
      withId(rp1, '550e8400-e29b-41d4-a716-446655440001') as TRolePermission,
      withId(rp2, '550e8400-e29b-41d4-a716-446655440002') as TRolePermission,
      withId(rp3, '550e8400-e29b-41d4-a716-446655440003') as TRolePermission,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testRolePermissions
      },
      getById: async function (id: string) {
        return (
          testRolePermissions.find(function (rp) {
            return rp.id === id
          }) || null
        )
      },
      create: async function (data: TRolePermissionCreate) {
        return withId(data, crypto.randomUUID()) as TRolePermission
      },
      update: async function (id: string, data: TRolePermissionUpdate) {
        const rp = testRolePermissions.find(function (item) {
          return item.id === id
        })
        if (!rp) return null
        return { ...rp, ...data } as TRolePermission
      },
      delete: async function (id: string) {
        return testRolePermissions.some(function (rp) {
          return rp.id === id
        })
      },
      getByRoleId: async function (roleId: string) {
        return testRolePermissions.filter(function (rp) {
          return rp.roleId === roleId
        })
      },
      getByPermissionId: async function (permissionId: string) {
        return testRolePermissions.filter(function (rp) {
          return rp.permissionId === permissionId
        })
      },
      exists: async function (roleId: string, permissionId: string) {
        return testRolePermissions.some(function (rp) {
          return rp.roleId === roleId && rp.permissionId === permissionId
        })
      },
      removeByRoleAndPermission: async function (roleId: string, permissionId: string) {
        return testRolePermissions.some(function (rp) {
          return rp.roleId === roleId && rp.permissionId === permissionId
        })
      },
    }

    // Create controller with mock repository
    const controller = new RolePermissionsController(
      mockRepository as unknown as RolePermissionsRepository
    )

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/role-permissions', controller.createRouter())

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all role-permissions', async function () {
      const res = await request('/role-permissions')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no role-permissions exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/role-permissions')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return role-permission by ID', async function () {
      const res = await request('/role-permissions/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.roleId).toBe(roleId1)
      expect(json.data.permissionId).toBe(permissionId1)
    })

    it('should return 404 when role-permission not found', async function () {
      const res = await request('/role-permissions/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/role-permissions/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /role/:roleId (getByRoleId)', function () {
    it('should return role-permissions by role ID', async function () {
      const res = await request(`/role-permissions/role/${roleId1}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (rp: TRolePermission) {
          return rp.roleId === roleId1
        })
      ).toBe(true)
    })

    it('should return empty array when no permissions for role', async function () {
      mockRepository.getByRoleId = async function () {
        return []
      }

      const res = await request('/role-permissions/role/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })

    it('should return 400 for invalid role UUID format', async function () {
      const res = await request('/role-permissions/role/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /permission/:permissionId (getByPermissionId)', function () {
    it('should return role-permissions by permission ID', async function () {
      const res = await request(`/role-permissions/permission/${permissionId1}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (rp: TRolePermission) {
          return rp.permissionId === permissionId1
        })
      ).toBe(true)
    })

    it('should return empty array when no roles for permission', async function () {
      mockRepository.getByPermissionId = async function () {
        return []
      }

      const res = await request('/role-permissions/permission/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /role/:roleId/permission/:permissionId/exists (checkExists)', function () {
    it('should return exists: true when role-permission exists', async function () {
      const res = await request(
        `/role-permissions/role/${roleId1}/permission/${permissionId1}/exists`
      )
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.exists).toBe(true)
    })

    it('should return exists: false when role-permission does not exist', async function () {
      mockRepository.exists = async function () {
        return false
      }

      const res = await request(
        `/role-permissions/role/${roleId1}/permission/550e8400-e29b-41d4-a716-446655440099/exists`
      )
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.exists).toBe(false)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new role-permission', async function () {
      const newRolePermission = createRolePermission(roleId2, permissionId2)

      const res = await request('/role-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRolePermission),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.roleId).toBe(roleId2)
      expect(json.data.permissionId).toBe(permissionId2)
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/role-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: 'invalid' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)

      const json = (await res.json()) as IStandardErrorResponse
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ErrorCodes.VALIDATION_ERROR)
      expect(json.error.message).toBeDefined()
      expect(json.error.fields).toBeDefined()
      expect(Array.isArray(json.error.fields)).toBe(true)
    })

    it('should return 409 when duplicate role-permission exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newRolePermission = createRolePermission(roleId1, permissionId1)

      const res = await request('/role-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRolePermission),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('already exists')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing role-permission', async function () {
      const newRegisteredBy = '550e8400-e29b-41d4-a716-446655440030'

      const res = await request('/role-permissions/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registeredBy: newRegisteredBy }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.registeredBy).toBe(newRegisteredBy)
    })

    it('should return 404 when updating non-existent role-permission', async function () {
      const res = await request('/role-permissions/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registeredBy: null }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing role-permission', async function () {
      const res = await request('/role-permissions/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent role-permission', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/role-permissions/550e8400-e29b-41d4-a716-446655440099', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('DELETE /role/:roleId/permission/:permissionId (removeByRoleAndPermission)', function () {
    it('should delete role-permission by role and permission IDs', async function () {
      const res = await request(`/role-permissions/role/${roleId1}/permission/${permissionId1}`, {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when role-permission assignment not found', async function () {
      mockRepository.removeByRoleAndPermission = async function () {
        return false
      }

      const res = await request(
        `/role-permissions/role/${roleId1}/permission/550e8400-e29b-41d4-a716-446655440099`,
        {
          method: 'DELETE',
        }
      )

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toBe('Role-permission assignment not found')
    })
  })

  describe('Error handling', function () {
    it('should return 500 for unexpected errors', async function () {
      mockRepository.listAll = async function () {
        throw new Error('Unexpected database error')
      }

      const res = await request('/role-permissions')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('unexpected')
    })
  })
})
