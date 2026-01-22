import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TSuperadminUserPermission, TSuperadminUserPermissionCreate } from '@packages/domain'
import { SuperadminUserPermissionsController } from '@http/controllers/superadmin-user-permissions'
import type { SuperadminUserPermissionsRepository } from '@database/repositories'
import { SuperadminUserPermissionFactory } from '../../setup/factories'
import { withId, createTestApp, getErrorMessage, type IApiResponse, type IStandardErrorResponse } from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockSuperadminUserPermissionsRepository = {
  listAll: () => Promise<TSuperadminUserPermission[]>
  getById: (id: string) => Promise<TSuperadminUserPermission | null>
  create: (data: TSuperadminUserPermissionCreate) => Promise<TSuperadminUserPermission>
  update: (
    id: string,
    data: Partial<TSuperadminUserPermissionCreate>
  ) => Promise<TSuperadminUserPermission | null>
  delete: (id: string) => Promise<boolean>
  getBySuperadminUserId: (superadminUserId: string) => Promise<TSuperadminUserPermission[]>
  hasPermission: (superadminUserId: string, permissionId: string) => Promise<boolean>
  deleteByPermissionId: (superadminUserId: string, permissionId: string) => Promise<boolean>
}

describe('SuperadminUserPermissionsController', function () {
  let app: Hono
  let mockRepository: TMockSuperadminUserPermissionsRepository
  let testPermissions: TSuperadminUserPermission[]
  let request: (path: string, options?: RequestInit) => Promise<Response>

  const testSuperadminId = '550e8400-e29b-41d4-a716-446655440001'
  const testPermissionId1 = '550e8400-e29b-41d4-a716-446655440010'
  const testPermissionId2 = '550e8400-e29b-41d4-a716-446655440011'

  beforeEach(async function () {
    // Create test data
    const perm1 = SuperadminUserPermissionFactory.create({
      superadminUserId: testSuperadminId,
      permissionId: testPermissionId1,
    })
    const perm2 = SuperadminUserPermissionFactory.create({
      superadminUserId: testSuperadminId,
      permissionId: testPermissionId2,
    })

    testPermissions = [
      withId(perm1, '550e8400-e29b-41d4-a716-446655440101') as TSuperadminUserPermission,
      withId(perm2, '550e8400-e29b-41d4-a716-446655440102') as TSuperadminUserPermission,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testPermissions
      },
      getById: async function (id: string) {
        return testPermissions.find(p => p.id === id) || null
      },
      create: async function (data: TSuperadminUserPermissionCreate) {
        return withId(data, crypto.randomUUID()) as TSuperadminUserPermission
      },
      update: async function (id: string, data: Partial<TSuperadminUserPermissionCreate>) {
        const perm = testPermissions.find(p => p.id === id)
        if (!perm) return null
        return { ...perm, ...data } as TSuperadminUserPermission
      },
      delete: async function (id: string) {
        return testPermissions.some(p => p.id === id)
      },
      getBySuperadminUserId: async function (superadminUserId: string) {
        return testPermissions.filter(p => p.superadminUserId === superadminUserId)
      },
      hasPermission: async function (superadminUserId: string, permissionId: string) {
        return testPermissions.some(
          p => p.superadminUserId === superadminUserId && p.permissionId === permissionId
        )
      },
      deleteByPermissionId: async function (superadminUserId: string, permissionId: string) {
        return testPermissions.some(
          p => p.superadminUserId === superadminUserId && p.permissionId === permissionId
        )
      },
    }

    // Create controller with mock repository
    const controller = new SuperadminUserPermissionsController(
      mockRepository as unknown as SuperadminUserPermissionsRepository
    )

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/superadmin-user-permissions', controller.createRouter())

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all permission assignments', async function () {
      const res = await request('/superadmin-user-permissions')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
    })

    it('should return empty array when no permissions exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/superadmin-user-permissions')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return permission assignment by ID', async function () {
      const res = await request('/superadmin-user-permissions/550e8400-e29b-41d4-a716-446655440101')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.superadminUserId).toBe(testSuperadminId)
      expect(json.data.permissionId).toBe(testPermissionId1)
    })

    it('should return 404 when permission assignment not found', async function () {
      const res = await request('/superadmin-user-permissions/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/superadmin-user-permissions/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /superadmin/:superadminUserId (getBySuperadminUserId)', function () {
    it('should return all permissions for a superadmin user', async function () {
      const res = await request(`/superadmin-user-permissions/superadmin/${testSuperadminId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(json.data.every((p: TSuperadminUserPermission) => p.superadminUserId === testSuperadminId)).toBe(true)
    })

    it('should return empty array when superadmin has no permissions', async function () {
      mockRepository.getBySuperadminUserId = async function () {
        return []
      }

      const res = await request(
        '/superadmin-user-permissions/superadmin/550e8400-e29b-41d4-a716-446655440099'
      )
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /check/:superadminUserId/:permissionId (checkHasPermission)', function () {
    it('should return true when superadmin has the permission', async function () {
      const res = await request(
        `/superadmin-user-permissions/check/${testSuperadminId}/${testPermissionId1}`
      )
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.hasPermission).toBe(true)
    })

    it('should return false when superadmin does not have the permission', async function () {
      mockRepository.hasPermission = async function () {
        return false
      }

      const res = await request(
        `/superadmin-user-permissions/check/${testSuperadminId}/550e8400-e29b-41d4-a716-446655440099`
      )
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.hasPermission).toBe(false)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new permission assignment', async function () {
      const newPermission = SuperadminUserPermissionFactory.create({
        superadminUserId: testSuperadminId,
        permissionId: '550e8400-e29b-41d4-a716-446655440020',
      })

      const res = await request('/superadmin-user-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPermission),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.superadminUserId).toBe(testSuperadminId)
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/superadmin-user-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ superadminUserId: 'not-a-uuid' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)

      const json = (await res.json()) as IStandardErrorResponse
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ErrorCodes.VALIDATION_ERROR)
    })

    it('should return 409 when duplicate permission assignment exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newPermission = SuperadminUserPermissionFactory.create({
        superadminUserId: testSuperadminId,
        permissionId: testPermissionId1,
      })

      const res = await request('/superadmin-user-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPermission),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('already exists')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing permission assignment', async function () {
      const res = await request('/superadmin-user-permissions/550e8400-e29b-41d4-a716-446655440101', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent permission', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/superadmin-user-permissions/550e8400-e29b-41d4-a716-446655440099', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('DELETE /superadmin/:superadminUserId/:permissionId (deleteByPermissionId)', function () {
    it('should delete permission by superadmin and permission ID', async function () {
      const res = await request(
        `/superadmin-user-permissions/superadmin/${testSuperadminId}/${testPermissionId1}`,
        {
          method: 'DELETE',
        }
      )

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when permission assignment does not exist', async function () {
      mockRepository.deleteByPermissionId = async function () {
        return false
      }

      const res = await request(
        `/superadmin-user-permissions/superadmin/${testSuperadminId}/550e8400-e29b-41d4-a716-446655440099`,
        {
          method: 'DELETE',
        }
      )

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toBe('Permission assignment not found')
    })
  })

  describe('Error handling', function () {
    it('should return 500 for unexpected errors', async function () {
      mockRepository.listAll = async function () {
        throw new Error('Unexpected database error')
      }

      const res = await request('/superadmin-user-permissions')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('unexpected')
    })
  })
})
