import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type {
  TSuperadminUser,
  TSuperadminUserCreate,
  TSuperadminUserUpdate,
} from '@packages/domain'
import { SuperadminUsersController } from '@http/controllers/superadmin-users'
import type { SuperadminUsersRepository } from '@database/repositories'
import { SuperadminUserFactory } from '../../setup/factories'
import { withId, createTestApp, type IApiResponse, type IStandardErrorResponse } from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockSuperadminUsersRepository = {
  listAll: () => Promise<TSuperadminUser[]>
  getById: (id: string) => Promise<TSuperadminUser | null>
  create: (data: TSuperadminUserCreate) => Promise<TSuperadminUser>
  update: (id: string, data: TSuperadminUserUpdate) => Promise<TSuperadminUser | null>
  delete: (id: string) => Promise<boolean>
  getByUserId: (userId: string) => Promise<TSuperadminUser | null>
  isUserSuperadmin: (userId: string) => Promise<boolean>
  updateLastAccess: (id: string) => Promise<void>
}

describe('SuperadminUsersController', function () {
  let app: Hono
  let mockRepository: TMockSuperadminUsersRepository
  let testSuperadmins: TSuperadminUser[]
  let request: (path: string, options?: RequestInit) => Promise<Response>

  const testUserId1 = '550e8400-e29b-41d4-a716-446655440010'
  const testUserId2 = '550e8400-e29b-41d4-a716-446655440011'

  beforeEach(async function () {
    // Create test data
    const superadmin1 = SuperadminUserFactory.active({
      userId: testUserId1,
      notes: 'Platform admin',
    })
    const superadmin2 = SuperadminUserFactory.inactive({
      userId: testUserId2,
      notes: 'Disabled admin',
    })

    testSuperadmins = [
      withId(superadmin1, '550e8400-e29b-41d4-a716-446655440001') as TSuperadminUser,
      withId(superadmin2, '550e8400-e29b-41d4-a716-446655440002') as TSuperadminUser,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testSuperadmins.filter(s => s.isActive)
      },
      getById: async function (id: string) {
        return testSuperadmins.find(s => s.id === id) || null
      },
      create: async function (data: TSuperadminUserCreate) {
        return withId(data, crypto.randomUUID()) as TSuperadminUser
      },
      update: async function (id: string, data: TSuperadminUserUpdate) {
        const superadmin = testSuperadmins.find(s => s.id === id)
        if (!superadmin) return null
        return { ...superadmin, ...data } as TSuperadminUser
      },
      delete: async function (id: string) {
        return testSuperadmins.some(s => s.id === id)
      },
      getByUserId: async function (userId: string) {
        return testSuperadmins.find(s => s.userId === userId) || null
      },
      isUserSuperadmin: async function (userId: string) {
        const superadmin = testSuperadmins.find(s => s.userId === userId)
        return superadmin?.isActive ?? false
      },
      updateLastAccess: async function () {
        // No-op for tests
      },
    }

    // Create controller with mock repository
    const controller = new SuperadminUsersController(
      mockRepository as unknown as SuperadminUsersRepository
    )

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/superadmin-users', controller.createRouter())

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return active superadmin users', async function () {
      const res = await request('/superadmin-users')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].isActive).toBe(true)
    })

    it('should return empty array when no superadmins exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/superadmin-users')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return superadmin user by ID', async function () {
      const res = await request('/superadmin-users/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.notes).toBe('Platform admin')
    })

    it('should return 404 when superadmin not found', async function () {
      const res = await request('/superadmin-users/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/superadmin-users/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /user/:userId (getByUserId)', function () {
    it('should return superadmin user by userId', async function () {
      const res = await request(`/superadmin-users/user/${testUserId1}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.userId).toBe(testUserId1)
      expect(json.data.notes).toBe('Platform admin')
    })

    it('should return 404 when user is not a superadmin', async function () {
      const res = await request('/superadmin-users/user/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Superadmin user not found')
    })
  })

  describe('GET /check/:userId (checkIsSuperadmin)', function () {
    it('should return true for active superadmin', async function () {
      const res = await request(`/superadmin-users/check/${testUserId1}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.isSuperadmin).toBe(true)
    })

    it('should return false for inactive superadmin', async function () {
      const res = await request(`/superadmin-users/check/${testUserId2}`)
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.isSuperadmin).toBe(false)
    })

    it('should return false for non-existent user', async function () {
      const res = await request('/superadmin-users/check/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.isSuperadmin).toBe(false)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new superadmin user', async function () {
      const newSuperadmin = SuperadminUserFactory.create({
        userId: '550e8400-e29b-41d4-a716-446655440020',
        notes: 'New admin',
      })

      const res = await request('/superadmin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSuperadmin),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.notes).toBe('New admin')
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/superadmin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'not-a-uuid' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)

      const json = (await res.json()) as IStandardErrorResponse
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ErrorCodes.VALIDATION_ERROR)
    })

    it('should return 409 when duplicate superadmin exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newSuperadmin = SuperadminUserFactory.create({ userId: testUserId1 })

      const res = await request('/superadmin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSuperadmin),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource already exists')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing superadmin user', async function () {
      const res = await request('/superadmin-users/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Updated notes' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.notes).toBe('Updated notes')
    })

    it('should return 404 when updating non-existent superadmin', async function () {
      const res = await request('/superadmin-users/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Updated' }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Resource not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing superadmin user', async function () {
      const res = await request('/superadmin-users/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent superadmin', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/superadmin-users/550e8400-e29b-41d4-a716-446655440099', {
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

      const res = await request('/superadmin-users')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('An unexpected error occurred')
    })
  })
})
