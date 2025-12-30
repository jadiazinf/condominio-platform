import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TUserRole, TUserRoleCreate, TUserRoleUpdate } from '@packages/domain'
import { UserRolesController } from '@http/controllers/user-roles'
import type { UserRolesRepository } from '@database/repositories'
import { withId, createTestApp, type IApiResponse, type IStandardErrorResponse } from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockUserRolesRepository = {
  listAll: () => Promise<TUserRole[]>
  getById: (id: string) => Promise<TUserRole | null>
  create: (data: TUserRoleCreate) => Promise<TUserRole>
  update: (id: string, data: TUserRoleUpdate) => Promise<TUserRole | null>
  delete: (id: string) => Promise<boolean>
  getByUserId: (userId: string) => Promise<TUserRole[]>
  getGlobalRolesByUser: (userId: string) => Promise<TUserRole[]>
  getByUserAndCondominium: (userId: string, condominiumId: string) => Promise<TUserRole[]>
  getByUserAndBuilding: (userId: string, buildingId: string) => Promise<TUserRole[]>
  userHasRole: (
    userId: string,
    roleId: string,
    condominiumId?: string,
    buildingId?: string
  ) => Promise<boolean>
}

function createUserRole(
  userId: string,
  roleId: string,
  overrides: Partial<TUserRoleCreate> = {}
): TUserRoleCreate {
  return {
    userId,
    roleId,
    condominiumId: null,
    buildingId: null,
    assignedBy: null,
    registeredBy: null,
    expiresAt: null,
    ...overrides,
  }
}

describe('UserRolesController', function () {
  let app: Hono
  let mockRepository: TMockUserRolesRepository
  let testUserRoles: TUserRole[]
  let request: (path: string, options?: RequestInit) => Promise<Response>

  const userId1 = '550e8400-e29b-41d4-a716-446655440010'
  const userId2 = '550e8400-e29b-41d4-a716-446655440011'
  const roleId1 = '550e8400-e29b-41d4-a716-446655440020'
  const roleId2 = '550e8400-e29b-41d4-a716-446655440021'
  const condominiumId = '550e8400-e29b-41d4-a716-446655440030'
  const buildingId = '550e8400-e29b-41d4-a716-446655440040'

  beforeEach(async function () {
    // Create test data
    const ur1 = createUserRole(userId1, roleId1) // Global role
    const ur2 = createUserRole(userId1, roleId2, { condominiumId }) // Condominium role
    const ur3 = createUserRole(userId2, roleId1, { buildingId }) // Building role

    testUserRoles = [
      withId(ur1, '550e8400-e29b-41d4-a716-446655440001') as TUserRole,
      withId(ur2, '550e8400-e29b-41d4-a716-446655440002') as TUserRole,
      withId(ur3, '550e8400-e29b-41d4-a716-446655440003') as TUserRole,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testUserRoles
      },
      getById: async function (id: string) {
        return (
          testUserRoles.find(function (ur) {
            return ur.id === id
          }) || null
        )
      },
      create: async function (data: TUserRoleCreate) {
        return withId(data, crypto.randomUUID()) as TUserRole
      },
      update: async function (id: string, data: TUserRoleUpdate) {
        const ur = testUserRoles.find(function (item) {
          return item.id === id
        })
        if (!ur) return null
        return { ...ur, ...data } as TUserRole
      },
      delete: async function (id: string) {
        return testUserRoles.some(function (ur) {
          return ur.id === id
        })
      },
      getByUserId: async function (userId: string) {
        return testUserRoles.filter(function (ur) {
          return ur.userId === userId
        })
      },
      getGlobalRolesByUser: async function (userId: string) {
        return testUserRoles.filter(function (ur) {
          return ur.userId === userId && !ur.condominiumId && !ur.buildingId
        })
      },
      getByUserAndCondominium: async function (userId: string, condominiumId: string) {
        return testUserRoles.filter(function (ur) {
          return ur.userId === userId && ur.condominiumId === condominiumId
        })
      },
      getByUserAndBuilding: async function (userId: string, buildingId: string) {
        return testUserRoles.filter(function (ur) {
          return ur.userId === userId && ur.buildingId === buildingId
        })
      },
      userHasRole: async function (
        userId: string,
        roleId: string,
        condominiumId?: string,
        buildingId?: string
      ) {
        return testUserRoles.some(function (ur) {
          if (ur.userId !== userId || ur.roleId !== roleId) return false
          if (condominiumId && ur.condominiumId !== condominiumId) return false
          if (buildingId && ur.buildingId !== buildingId) return false
          return true
        })
      },
    }

    // Create controller with mock repository
    const controller = new UserRolesController(mockRepository as unknown as UserRolesRepository)

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/user-roles', controller.createRouter())

    // Get auth token

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all user-roles', async function () {
      const res = await request('/user-roles')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no user-roles exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/user-roles')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return user-role by ID', async function () {
      const res = await request('/user-roles/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.userId).toBe(userId1)
      expect(json.data.roleId).toBe(roleId1)
    })

    it('should return 404 when user-role not found', async function () {
      const res = await request('/user-roles/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/user-roles/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /user/:userId (getByUserId)', function () {
    it('should return user-roles by user ID', async function () {
      const res = await request(`/user-roles/user/${userId1}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (ur: TUserRole) {
          return ur.userId === userId1
        })
      ).toBe(true)
    })

    it('should return empty array when no roles for user', async function () {
      mockRepository.getByUserId = async function () {
        return []
      }

      const res = await request('/user-roles/user/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /user/:userId/global (getGlobalRolesByUser)', function () {
    it('should return global roles for user', async function () {
      const res = await request(`/user-roles/user/${userId1}/global`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].condominiumId).toBeNull()
      expect(json.data[0].buildingId).toBeNull()
    })

    it('should return empty array when user has no global roles', async function () {
      mockRepository.getGlobalRolesByUser = async function () {
        return []
      }

      const res = await request(`/user-roles/user/${userId2}/global`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /user/:userId/condominium/:condominiumId (getByUserAndCondominium)', function () {
    it('should return roles for user in condominium', async function () {
      const res = await request(`/user-roles/user/${userId1}/condominium/${condominiumId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].condominiumId).toBe(condominiumId)
    })

    it('should return empty array when no roles for user in condominium', async function () {
      mockRepository.getByUserAndCondominium = async function () {
        return []
      }

      const res = await request(`/user-roles/user/${userId2}/condominium/${condominiumId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /user/:userId/building/:buildingId (getByUserAndBuilding)', function () {
    it('should return roles for user in building', async function () {
      const res = await request(`/user-roles/user/${userId2}/building/${buildingId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].buildingId).toBe(buildingId)
    })

    it('should return empty array when no roles for user in building', async function () {
      mockRepository.getByUserAndBuilding = async function () {
        return []
      }

      const res = await request(`/user-roles/user/${userId1}/building/${buildingId}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /user/:userId/has-role (checkUserHasRole)', function () {
    it('should return hasRole: true when user has role', async function () {
      const res = await request(`/user-roles/user/${userId1}/has-role?roleId=${roleId1}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.hasRole).toBe(true)
    })

    it('should return hasRole: false when user does not have role', async function () {
      mockRepository.userHasRole = async function () {
        return false
      }

      const res = await request(`/user-roles/user/${userId1}/has-role?roleId=${roleId2}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.hasRole).toBe(false)
    })

    it('should check role with condominium context', async function () {
      const res = await request(
        `/user-roles/user/${userId1}/has-role?roleId=${roleId2}&condominiumId=${condominiumId}`
      )
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.hasRole).toBe(true)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new user-role', async function () {
      const newUserRole = createUserRole(userId2, roleId2)

      const res = await request('/user-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserRole),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.userId).toBe(userId2)
      expect(json.data.roleId).toBe(roleId2)
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/user-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'invalid' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)

      const json = (await res.json()) as IStandardErrorResponse
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ErrorCodes.VALIDATION_ERROR)
      expect(json.error.message).toBeDefined()
      expect(json.error.fields).toBeDefined()
      expect(Array.isArray(json.error.fields)).toBe(true)
    })

    it('should return 409 when duplicate user-role exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newUserRole = createUserRole(userId1, roleId1)

      const res = await request('/user-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserRole),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource already exists')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing user-role', async function () {
      const newAssignedBy = '550e8400-e29b-41d4-a716-446655440050'

      const res = await request('/user-roles/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedBy: newAssignedBy }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.assignedBy).toBe(newAssignedBy)
    })

    it('should return 404 when updating non-existent user-role', async function () {
      const res = await request('/user-roles/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedBy: null }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing user-role', async function () {
      const res = await request('/user-roles/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent user-role', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/user-roles/550e8400-e29b-41d4-a716-446655440099', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })
  })

  describe('Error handling', function () {
    it('should return 500 for unexpected errors', async function () {
      mockRepository.listAll = async function () {
        throw new Error('Unexpected database error')
      }

      const res = await request('/user-roles')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('An unexpected error occurred')
    })
  })
})
