import { describe, it, expect, beforeEach } from 'bun:test'
import type { TAuditLog } from '@packages/domain'
import { GetAuditLogsByTableAndRecordService } from '@src/services/audit-logs'

type TMockRepository = {
  getByTableAndRecord: (tableName: string, recordId: string) => Promise<TAuditLog[]>
}

describe('GetAuditLogsByTableAndRecordService', function () {
  let service: GetAuditLogsByTableAndRecordService
  let mockRepository: TMockRepository

  const tableName = 'users'
  const recordId = '550e8400-e29b-41d4-a716-446655440010'

  const mockAuditLogs: TAuditLog[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      tableName,
      recordId,
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
      tableName,
      recordId,
      action: 'UPDATE',
      oldValues: { name: 'John Doe' },
      newValues: { name: 'John Smith' },
      changedFields: ['name'],
      userId: '550e8400-e29b-41d4-a716-446655440020',
      ipAddress: '192.168.1.2',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      tableName: 'payments',
      recordId,
      action: 'INSERT',
      oldValues: null,
      newValues: { amount: 100 },
      changedFields: ['amount'],
      userId: '550e8400-e29b-41d4-a716-446655440020',
      ipAddress: '192.168.1.3',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByTableAndRecord: async function (requestedTableName: string, requestedRecordId: string) {
        return mockAuditLogs.filter(function (log) {
          return log.tableName === requestedTableName && log.recordId === requestedRecordId
        })
      },
    }
    service = new GetAuditLogsByTableAndRecordService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return audit logs for a specific table and record', async function () {
      const result = await service.execute({ tableName, recordId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(
          result.data.every(log => log.tableName === tableName && log.recordId === recordId)
        ).toBe(true)
      }
    })

    it('should return empty array when no logs match table and record', async function () {
      const result = await service.execute({
        tableName: 'units',
        recordId: '550e8400-e29b-41d4-a716-446655440099',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })

    it('should filter by both table and record correctly', async function () {
      const result = await service.execute({
        tableName: 'payments',
        recordId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        const log = result.data[0]
        expect(log).toBeDefined()
        expect(log!.tableName).toBe('payments')
      }
    })
  })
})
