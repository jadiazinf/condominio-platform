import { describe, it, expect, beforeAll, beforeEach , afterAll} from 'bun:test'
import { AuditLogsRepository, UsersRepository } from '@database/repositories'
import {
  startTestContainer,
  cleanDatabase,
  UserFactory,
  AuditLogFactory,
  type TTestDrizzleClient,
 stopTestContainer} from '@tests/setup'

describe('AuditLogsRepository', () => {
  let db: TTestDrizzleClient
  let repository: AuditLogsRepository
  let usersRepository: UsersRepository
  let testUser: { id: string }

  beforeAll(async () => {
    db = await startTestContainer()
    repository = new AuditLogsRepository(db)
    usersRepository = new UsersRepository(db)
  }, 120000)

  afterAll(async () => {
    await stopTestContainer()
  })

  beforeEach(async () => {
    await cleanDatabase(db)
    testUser = await usersRepository.create(UserFactory.create({ email: 'audit@test.com' }))
  })

  function createAuditLogData(overrides: Record<string, unknown> = {}) {
    return AuditLogFactory.withUser(testUser.id, overrides)
  }

  describe('create', () => {
    it('should create a new audit log for INSERT', async () => {
      const data = createAuditLogData({
        tableName: 'currencies',
        action: 'INSERT',
        oldValues: null,
        newValues: { code: 'USD' },
      })

      const result = await repository.create(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.tableName).toBe('currencies')
      expect(result.action).toBe('INSERT')
      expect(result.oldValues).toBeNull()
      expect(result.newValues).toEqual({ code: 'USD' })
      expect(result.createdAt).toBeInstanceOf(Date)
    })

    it('should create audit log for UPDATE', async () => {
      const data = createAuditLogData({
        action: 'UPDATE',
        oldValues: { name: 'Old Name' },
        newValues: { name: 'New Name' },
        changedFields: ['name'],
      })

      const result = await repository.create(data)

      expect(result.action).toBe('UPDATE')
      expect(result.oldValues).toEqual({ name: 'Old Name' })
      expect(result.newValues).toEqual({ name: 'New Name' })
      expect(result.changedFields).toEqual(['name'])
    })

    it('should create audit log for DELETE', async () => {
      const data = createAuditLogData({
        action: 'DELETE',
        oldValues: { code: 'USD', name: 'US Dollar' },
        newValues: null,
      })

      const result = await repository.create(data)

      expect(result.action).toBe('DELETE')
      expect(result.oldValues).toEqual({ code: 'USD', name: 'US Dollar' })
    })

    it('should store IP address and user agent', async () => {
      const data = createAuditLogData({
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
      })

      const result = await repository.create(data)

      expect(result.ipAddress).toBe('10.0.0.1')
      expect(result.userAgent).toBe('Mozilla/5.0')
    })
  })

  describe('getById', () => {
    it('should return audit log by id', async () => {
      const created = await repository.create(createAuditLogData())

      const result = await repository.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.id).toBe(created.id)
    })

    it('should return null for non-existent id', async () => {
      const result = await repository.getById('00000000-0000-0000-0000-000000000000')

      expect(result).toBeNull()
    })
  })

  describe('listAll', () => {
    it('should return all audit logs ordered by createdAt desc', async () => {
      await repository.create(createAuditLogData({ tableName: 'table1' }))
      await repository.create(createAuditLogData({ tableName: 'table2' }))
      await repository.create(createAuditLogData({ tableName: 'table3' }))

      const result = await repository.listAll()

      expect(result).toHaveLength(3)
    })
  })

  describe('getByTableName', () => {
    it('should return audit logs by table name', async () => {
      await repository.create(createAuditLogData({ tableName: 'currencies' }))
      await repository.create(createAuditLogData({ tableName: 'currencies' }))
      await repository.create(createAuditLogData({ tableName: 'users' }))

      const result = await repository.getByTableName('currencies')

      expect(result).toHaveLength(2)
      expect(result.every(l => l.tableName === 'currencies')).toBe(true)
    })
  })

  describe('getByRecordId', () => {
    it('should return audit logs by record id', async () => {
      const recordId = '11111111-1111-1111-1111-111111111111'

      await repository.create(createAuditLogData({ recordId, action: 'INSERT' }))
      await repository.create(createAuditLogData({ recordId, action: 'UPDATE' }))
      await repository.create(
        createAuditLogData({ recordId: '22222222-2222-2222-2222-222222222222' })
      )

      const result = await repository.getByRecordId(recordId)

      expect(result).toHaveLength(2)
      expect(result.every(l => l.recordId === recordId)).toBe(true)
    })
  })

  describe('getByUserId', () => {
    it('should return audit logs by user', async () => {
      const otherUser = await usersRepository.create(
        UserFactory.create({ email: 'other@test.com' })
      )

      await repository.create(createAuditLogData({ userId: testUser.id }))
      await repository.create(createAuditLogData({ userId: testUser.id }))
      await repository.create(createAuditLogData({ userId: otherUser.id }))

      const result = await repository.getByUserId(testUser.id)

      expect(result).toHaveLength(2)
      expect(result.every(l => l.userId === testUser.id)).toBe(true)
    })
  })

  describe('getByAction', () => {
    it('should return audit logs by action type', async () => {
      await repository.create(createAuditLogData({ action: 'INSERT' }))
      await repository.create(createAuditLogData({ action: 'UPDATE' }))
      await repository.create(createAuditLogData({ action: 'UPDATE' }))
      await repository.create(createAuditLogData({ action: 'DELETE' }))

      const result = await repository.getByAction('UPDATE')

      expect(result).toHaveLength(2)
      expect(result.every(l => l.action === 'UPDATE')).toBe(true)
    })
  })

  describe('getByTableAndRecord', () => {
    it('should return audit logs for specific table and record', async () => {
      const recordId = '33333333-3333-3333-3333-333333333333'

      await repository.create(createAuditLogData({ tableName: 'currencies', recordId }))
      await repository.create(createAuditLogData({ tableName: 'currencies', recordId }))
      await repository.create(createAuditLogData({ tableName: 'users', recordId }))

      const result = await repository.getByTableAndRecord('currencies', recordId)

      expect(result).toHaveLength(2)
    })
  })

  describe('getByDateRange', () => {
    it('should return audit logs within date range', async () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      await repository.create(createAuditLogData())
      await repository.create(createAuditLogData())

      const result = await repository.getByDateRange(yesterday, tomorrow)

      expect(result).toHaveLength(2)
    })
  })
})
