import { describe, it, expect, beforeEach } from 'bun:test'
import type { TAuditLog, TAuditAction } from '@packages/domain'
import { GetAuditLogsByActionService } from '@src/services/audit-logs'

type TMockRepository = {
  getByAction: (action: TAuditAction) => Promise<TAuditLog[]>
}

describe('GetAuditLogsByActionService', function () {
  let service: GetAuditLogsByActionService
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
      recordId: '550e8400-e29b-41d4-a716-446655440010',
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
      recordId: '550e8400-e29b-41d4-a716-446655440011',
      action: 'DELETE',
      oldValues: { amount: 100 },
      newValues: null,
      changedFields: null,
      userId: '550e8400-e29b-41d4-a716-446655440020',
      ipAddress: '192.168.1.3',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByAction: async function (action: TAuditAction) {
        return mockAuditLogs.filter(function (log) {
          return log.action === action
        })
      },
    }
    service = new GetAuditLogsByActionService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all INSERT audit logs', async function () {
      const result = await service.execute({ action: 'INSERT' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every(log => log.action === 'INSERT')).toBe(true)
      }
    })

    it('should return all UPDATE audit logs', async function () {
      const result = await service.execute({ action: 'UPDATE' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every(log => log.action === 'UPDATE')).toBe(true)
      }
    })

    it('should return all DELETE audit logs', async function () {
      const result = await service.execute({ action: 'DELETE' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data.every(log => log.action === 'DELETE')).toBe(true)
      }
    })
  })
})
