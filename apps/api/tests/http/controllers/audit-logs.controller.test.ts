import './setup-auth-mock'
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { StatusCodes } from 'http-status-codes'
import type { TAuditLog, TAuditLogCreate, TAuditAction } from '@packages/domain'
import { AuditLogsController } from '@http/controllers/audit-logs'
import type { AuditLogsRepository } from '@database/repositories'
import { AuditLogFactory } from '../../setup/factories'
import { withId, createTestApp, type IApiResponse, type IStandardErrorResponse } from './test-utils'
import { ErrorCodes } from '@http/responses/types'

// Mock repository type with custom methods
type TMockAuditLogsRepository = {
  listAll: () => Promise<TAuditLog[]>
  getById: (id: string) => Promise<TAuditLog | null>
  create: (data: TAuditLogCreate) => Promise<TAuditLog>
  getByTableName: (tableName: string) => Promise<TAuditLog[]>
  getByRecordId: (recordId: string) => Promise<TAuditLog[]>
  getByTableAndRecord: (tableName: string, recordId: string) => Promise<TAuditLog[]>
  getByUserId: (userId: string) => Promise<TAuditLog[]>
  getByAction: (action: TAuditAction) => Promise<TAuditLog[]>
  getByDateRange: (startDate: Date, endDate: Date) => Promise<TAuditLog[]>
}

describe('AuditLogsController', function () {
  let app: Hono
  let request: (path: string, options?: RequestInit) => Promise<Response>
  let mockRepository: TMockAuditLogsRepository
  let testLogs: TAuditLog[]

  beforeEach(function () {
    // Create test data
    const log1 = AuditLogFactory.create({
      tableName: 'users',
      recordId: '550e8400-e29b-41d4-a716-446655440001',
      action: 'INSERT',
      userId: '550e8400-e29b-41d4-a716-446655440010',
    })
    const log2 = AuditLogFactory.create({
      tableName: 'users',
      recordId: '550e8400-e29b-41d4-a716-446655440001',
      action: 'UPDATE',
      userId: '550e8400-e29b-41d4-a716-446655440010',
    })
    const log3 = AuditLogFactory.create({
      tableName: 'currencies',
      recordId: '550e8400-e29b-41d4-a716-446655440002',
      action: 'DELETE',
      userId: '550e8400-e29b-41d4-a716-446655440020',
    })

    testLogs = [
      {
        ...withId(log1, '550e8400-e29b-41d4-a716-446655440101'),
        createdAt: new Date('2024-01-15'),
      } as TAuditLog,
      {
        ...withId(log2, '550e8400-e29b-41d4-a716-446655440102'),
        createdAt: new Date('2024-01-16'),
      } as TAuditLog,
      {
        ...withId(log3, '550e8400-e29b-41d4-a716-446655440103'),
        createdAt: new Date('2024-01-17'),
      } as TAuditLog,
    ]

    // Create mock repository
    mockRepository = {
      listAll: async function () {
        return testLogs
      },
      getById: async function (id: string) {
        return (
          testLogs.find(function (l) {
            return l.id === id
          }) || null
        )
      },
      create: async function (data: TAuditLogCreate) {
        return withId(data, crypto.randomUUID()) as TAuditLog
      },
      getByTableName: async function (tableName: string) {
        return testLogs.filter(function (l) {
          return l.tableName === tableName
        })
      },
      getByRecordId: async function (recordId: string) {
        return testLogs.filter(function (l) {
          return l.recordId === recordId
        })
      },
      getByTableAndRecord: async function (tableName: string, recordId: string) {
        return testLogs.filter(function (l) {
          return l.tableName === tableName && l.recordId === recordId
        })
      },
      getByUserId: async function (userId: string) {
        return testLogs.filter(function (l) {
          return l.userId === userId
        })
      },
      getByAction: async function (action: TAuditAction) {
        return testLogs.filter(function (l) {
          return l.action === action
        })
      },
      getByDateRange: async function (startDate: Date, endDate: Date) {
        return testLogs.filter(function (l) {
          return l.createdAt >= startDate && l.createdAt <= endDate
        })
      },
    }

    // Create controller with mock repository
    const controller = new AuditLogsController(mockRepository as unknown as AuditLogsRepository)

    // Create Hono app with controller routes
    app = createTestApp()
    app.route('/audit-logs', controller.createRouter())

    request = async (path, options) => app.request(path, options)
  })

  describe('GET / (list)', function () {
    it('should return all audit logs', async function () {
      const res = await request('/audit-logs')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(3)
    })

    it('should return empty array when no logs exist', async function () {
      mockRepository.listAll = async function () {
        return []
      }

      const res = await request('/audit-logs')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /:id (getById)', function () {
    it('should return audit log by ID', async function () {
      const res = await request('/audit-logs/550e8400-e29b-41d4-a716-446655440101')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data.tableName).toBe('users')
      expect(json.data.action).toBe('INSERT')
    })

    it('should return 404 when audit log not found', async function () {
      const res = await request('/audit-logs/550e8400-e29b-41d4-a716-446655440999')
      expect(res.status).toBe(StatusCodes.NOT_FOUND)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('Audit log not found')
    })

    it('should return 400 for invalid UUID format', async function () {
      const res = await request('/audit-logs/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /table/:tableName (getByTableName)', function () {
    it('should return logs by table name', async function () {
      const res = await request('/audit-logs/table/users')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
      expect(
        json.data.every(function (l: TAuditLog) {
          return l.tableName === 'users'
        })
      ).toBe(true)
    })

    it('should return empty array when no logs for table', async function () {
      const res = await request('/audit-logs/table/unknown')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /record/:recordId (getByRecordId)', function () {
    it('should return logs by record ID', async function () {
      const res = await request('/audit-logs/record/550e8400-e29b-41d4-a716-446655440001')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
    })

    it('should return empty array when no logs for record', async function () {
      mockRepository.getByRecordId = async function () {
        return []
      }

      const res = await request('/audit-logs/record/550e8400-e29b-41d4-a716-446655440999')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /table/:tableName/record/:recordId (getByTableAndRecord)', function () {
    it('should return logs by table and record', async function () {
      const res = await request(
        '/audit-logs/table/users/record/550e8400-e29b-41d4-a716-446655440001'
      )
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
    })

    it('should return empty array when no matching logs', async function () {
      mockRepository.getByTableAndRecord = async function () {
        return []
      }

      const res = await request(
        '/audit-logs/table/unknown/record/550e8400-e29b-41d4-a716-446655440001'
      )
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })
  })

  describe('GET /user/:userId (getByUserId)', function () {
    it('should return logs by user ID', async function () {
      const res = await request('/audit-logs/user/550e8400-e29b-41d4-a716-446655440010')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
    })

    it('should return empty array when no logs for user', async function () {
      mockRepository.getByUserId = async function () {
        return []
      }

      const res = await request('/audit-logs/user/550e8400-e29b-41d4-a716-446655440999')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(0)
    })

    it('should return 400 for invalid user UUID format', async function () {
      const res = await request('/audit-logs/user/invalid-id')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /action/:action (getByAction)', function () {
    it('should return logs by action INSERT', async function () {
      const res = await request('/audit-logs/action/INSERT')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].action).toBe('INSERT')
    })

    it('should return logs by action UPDATE', async function () {
      const res = await request('/audit-logs/action/UPDATE')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].action).toBe('UPDATE')
    })

    it('should return logs by action DELETE', async function () {
      const res = await request('/audit-logs/action/DELETE')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
      expect(json.data[0].action).toBe('DELETE')
    })

    it('should return 400 for invalid action', async function () {
      const res = await request('/audit-logs/action/INVALID')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('GET /date-range (getByDateRange)', function () {
    it('should return logs by date range', async function () {
      const res = await request('/audit-logs/date-range?startDate=2024-01-15&endDate=2024-01-16')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(2)
    })

    it('should return logs within a single day', async function () {
      const res = await request('/audit-logs/date-range?startDate=2024-01-17&endDate=2024-01-17')
      expect(res.status).toBe(StatusCodes.OK)

      const json = (await res.json()) as IApiResponse
      expect(json.data).toHaveLength(1)
    })

    it('should return 400 for invalid date format', async function () {
      const res = await request('/audit-logs/date-range?startDate=invalid&endDate=2024-01-16')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })

    it('should return 400 for missing date parameters', async function () {
      const res = await request('/audit-logs/date-range?startDate=2024-01-15')
      expect(res.status).toBe(StatusCodes.BAD_REQUEST)
    })
  })

  describe('POST / (create)', function () {
    it('should create a new audit log', async function () {
      const newLog = AuditLogFactory.create({
        tableName: 'roles',
        recordId: crypto.randomUUID(),
        action: 'INSERT',
      })

      const res = await request('/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog),
      })

      expect(res.status).toBe(StatusCodes.CREATED)

      const json = (await res.json()) as IApiResponse
      expect(json.data.tableName).toBe('roles')
      expect(json.data.action).toBe('INSERT')
      expect(json.data.id).toBeDefined()
    })

    it('should return 422 for invalid body', async function () {
      const res = await request('/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableName: '' }),
      })

      expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY)

      const json = (await res.json()) as IStandardErrorResponse
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ErrorCodes.VALIDATION_ERROR)
      expect(json.error.message).toBeDefined()
      expect(json.error.fields).toBeDefined()
      expect(Array.isArray(json.error.fields)).toBe(true)
    })
  })

  describe('Error handling', function () {
    it('should return 500 for unexpected errors', async function () {
      mockRepository.listAll = async function () {
        throw new Error('Unexpected database error')
      }

      const res = await request('/audit-logs')
      expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

      const json = (await res.json()) as IApiResponse
      expect(json.error).toBe('An unexpected error occurred')
    })
  })
})
