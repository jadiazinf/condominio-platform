import { describe, it, expect, beforeEach } from 'bun:test'
import type { TAuditLog } from '@packages/domain'
import { GetAuditLogsByTableService } from '@src/services/audit-logs'

type TMockRepository = {
  getByTableName: (tableName: string) => Promise<TAuditLog[]>
}

describe('GetAuditLogsByTableService', function () {
  let service: GetAuditLogsByTableService
  let mockRepository: TMockRepository

  const mockAuditLogs: TAuditLog[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      tableName: 'users',
      recordId: '550e8400-e29b-41d4-a716-446655440010',
      action: 'INSERT',
      oldValues: null,
      newValues: { name: 'John Doe' },
      changedFields: ['name'],
      userId: '550e8400-e29b-41d4-a716-446655440020',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      tableName: 'users',
      recordId: '550e8400-e29b-41d4-a716-446655440011',
      action: 'UPDATE',
      oldValues: { name: 'Jane' },
      newValues: { name: 'Jane Doe' },
      changedFields: ['name'],
      userId: '550e8400-e29b-41d4-a716-446655440020',
      ipAddress: '192.168.1.2',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByTableName: async function (tableName: string) {
        return mockAuditLogs.filter(function (log) {
          return log.tableName === tableName
        })
      },
    }
    service = new GetAuditLogsByTableService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all audit logs for a table', async function () {
      const result = await service.execute({ tableName: 'users' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(log => log.tableName === 'users')).toBe(true)
      }
    })

    it('should return empty array when table has no audit logs', async function () {
      const result = await service.execute({ tableName: 'payments' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
