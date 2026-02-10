import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TUser, TUserCreate, TUserUpdate } from '@packages/domain'
import { UsersController } from '@http/controllers/users'
import type { UsersRepository } from '@database/repositories'
import { UserFactory } from '../../setup/factories'
import {
  withId,
  createTestApp,
  getErrorMessage,
  type IApiResponse,
  type IStandardErrorResponse,
} from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockUsersRepository = {
  _id?: number
  listAll: () => Promise<TUser[]>
  getById: (id: string) => Promise<TUser | null>
  create: (data: TUserCreate) => Promise<TUser>
  update: (id: string, data: TUserUpdate) => Promise<TUser | null>
  delete: (id: string) => Promise<boolean>
  getByEmail: (email: string) => Promise<TUser | null>
  getByFirebaseUid: (firebaseUid: string) => Promise<TUser | null>
  updateLastLogin: (id: string) => Promise<TUser | null>
}

describe('UsersController', function () {
  let app: Hono
  let mockRepository: TMockUsersRepository
  let testUsers: TUser[]
  let request: (path: string, options?: RequestInit) => Promise<Response>

  beforeEach(async function () {
    // Create test data for controller mock
    const userData1 = UserFactory.create({ email: 'user1@test.com', firebaseUid: 'firebase-uid-2' })
    const userData2 = UserFactory.create({ email: 'user2@test.com', firebaseUid: 'firebase-uid-3' })

    testUsers = [
      withId(userData1, '550e8400-e29b-41d4-a716-446655440001') as TUser,
      withId(userData2, '550e8400-e29b-41d4-a716-446655440002') as TUser,
    ]

    // Create mock repository
    mockRepository = {
      _id: Math.random(),
      listAll: async function () {
        return testUsers
      },
      getById: async function (id: string) {
        return (
          testUsers.find(function (u) {
            return u.id === id
          }) || null
        )
      },
      create: async function (data: TUserCreate) {
        return withId(data, crypto.randomUUID()) as TUser
      },
      update: async function (id: string, data: TUserUpdate) {
        const user = testUsers.find(function (u) {
          return u.id === id
        })
        if (!user) return null
        return { ...user, ...data } as TUser
      },
      delete: async function (id: string) {
        return testUsers.some(function (u) {
          return u.id === id
        })
      },
      getByEmail: async function (email: string) {
        return (
          testUsers.find(function (u) {
            return u.email === email
          }) || null
        )
      },
      getByFirebaseUid: async function (firebaseUid: string) {
        return (
          testUsers.find(function (u) {
            return u.firebaseUid === firebaseUid
          }) || null
        )
      },
      updateLastLogin: async function (id: string) {
        const user = testUsers.find(function (u) {
          return u.id === id
        })
        if (!user) return null
        return { ...user, lastLogin: new Date() } as TUser
      },
    }

    // Create mock db client (not used in basic CRUD tests)
    const mockDb = {} as any

    // Create mock user permissions repository
    const mockUserPermissionsRepository = {} as any

    // Create mock user roles repository
    const mockUserRolesRepository = {} as any

    // Create controller with mock repository, db, and user permissions repository
    // Create mock management company members repository
    const mockManagementCompanyMembersRepository = {} as any

    const controller = new UsersController(mockRepository as unknown as UsersRepository, mockDb, mockUserPermissionsRepository, mockUserRolesRepository, mockManagementCompanyMembersRepository)

    // Create Hono app with i18n middleware and controller routes
    app = createTestApp()
    app.route('/users', controller.createRouter())

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all users', async function () {
      const res = await request('/users')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
    })

    it('should return empty array when no users exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/users')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return user by ID', async function () {
      const res = await request('/users/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.email).toBe('user1@test.com')
    })

    it('should return 404 when user not found', async function () {
      const res = await request('/users/550e8400-e29b-41d4-a716-446655440099')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/users/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /email/:email (getByEmail)', function () {
    it('should return user by email', async function () {
      const res = await request('/users/email/user1@test.com')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.email).toBe('user1@test.com')
    })

    it('should return 404 when user with email not found', async function () {
      const res = await request('/users/email/nonexistent@test.com')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })

    it('should return 400 for invalid email format', async function () {
      const res = await request('/users/email/invalid-email')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /firebase/:firebaseUid (getByFirebaseUid)', function () {
    it('should return user by Firebase UID', async function () {
      const res = await request('/users/firebase/firebase-uid-2')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.firebaseUid).toBe('firebase-uid-2')
    })

    it('should return 404 when user with Firebase UID not found', async function () {
      const res = await request('/users/firebase/nonexistent-uid')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('POST / (create)', function () {
    it('should create a new user', async function () {
      const newUser = UserFactory.create({ email: 'newuser@test.com' })

      const res = await request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.email).toBe('newuser@test.com')
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)

      const json = (await res.json()) as IStandardErrorResponse
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ErrorCodes.VALIDATION_ERROR)
      expect(json.error.message).toBeDefined()
      expect(json.error.fields).toBeDefined()
      expect(Array.isArray(json.error.fields)).toBe(true)
    })

    it('should return 409 when duplicate user exists', async function () {
      mockRepository.create = async function () {
        throw new Error('duplicate key value violates unique constraint')
      }

      const newUser = UserFactory.create({ email: 'user1@test.com' })

      const res = await request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })

      expect(res.status).toBe(StatusCodes.CONFLICT)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('already exists')
    })
  })

  describe('PATCH /:id (update)', function () {
    it('should update an existing user', async function () {
      const res = await request('/users/550e8400-e29b-41d4-a716-446655440001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Updated Name' }),
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.displayName).toBe('Updated Name')
    })

    it('should return 404 when updating non-existent user', async function () {
      const res = await request('/users/550e8400-e29b-41d4-a716-446655440099', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Updated Name' }),
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('DELETE /:id (delete)', function () {
    it('should delete an existing user', async function () {
      const res = await request('/users/550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NO_CONTENT)
    })

    it('should return 404 when deleting non-existent user', async function () {
      mockRepository.delete = async function () {
        return false
      }

      const res = await request('/users/550e8400-e29b-41d4-a716-446655440099', {
        method: 'DELETE',
      })

      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('not found')
    })
  })

  describe('POST /:id/last-login (updateLastLogin)', function () {
    it('should update last login timestamp', async function () {
      const res = await request('/users/550e8400-e29b-41d4-a716-446655440001/last-login', {
        method: 'POST',
      })

      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.lastLogin).toBeDefined()
    })

    it('should return 404 when user not found', async function () {
      const res = await request('/users/550e8400-e29b-41d4-a716-446655440099/last-login', {
        method: 'POST',
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

      const res = await request('/users')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('unexpected')
    })

    it('should return 400 for foreign key violations', async function () {
      mockRepository.create = async function () {
        throw new Error('violates foreign key constraint')
      }

      const newUser = UserFactory.create()

      const res = await request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })

      expect(res.status).toBe(StatusCodes.BAD_REQUEST)

      const json = (await res.json()) as IApiResponse
      expect(getErrorMessage(json)).toContain('reference')
    })
  })
})
