import { describe, it, expect, beforeEach } from 'bun:test'
import type { TAuditLog } from '@packages/domain'
import { GetAuditLogsByRecordService } from '@src/services/audit-logs'

type TMockRepository = {
  getByRecordId: (recordId: string) => Promise<TAuditLog[]>
}

describe('GetAuditLogsByRecordService', function () {
  let service: GetAuditLogsByRecordService
  let mockRepository: TMockRepository

  const recordId = '550e8400-e29b-41d4-a716-446655440010'

  const mockAuditLogs: TAuditLog[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      tableName: 'users',
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
      tableName: 'users',
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
  ]

  beforeEach(function () {
    mockRepository = {
      getByRecordId: async function (requestedRecordId: string) {
        return mockAuditLogs.filter(function (log) {
          return log.recordId === requestedRecordId
        })
      },
    }
    service = new GetAuditLogsByRecordService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all audit logs for a record', async function () {
      const result = await service.execute({ recordId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every(log => log.recordId === recordId)).toBe(true)
      }
    })

    it('should return empty array when record has no audit logs', async function () {
      const result = await service.execute({ recordId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
