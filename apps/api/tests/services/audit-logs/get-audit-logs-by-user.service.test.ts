import { describe, it, expect, beforeEach } from 'bun:test'
import type { TAuditLog } from '@packages/domain'
import { GetAuditLogsByUserService } from '@src/services/audit-logs'

type TMockRepository = {
  getByUserId: (userId: string) => Promise<TAuditLog[]>
}

describe('GetAuditLogsByUserService', function () {
  let service: GetAuditLogsByUserService
  let mockRepository: TMockRepository

  const userId = '550e8400-e29b-41d4-a716-446655440020'

  const mockAuditLogs: TAuditLog[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      tableName: 'users',
      recordId: '550e8400-e29b-41d4-a716-446655440010',
      action: 'INSERT',
      oldValues: null,
      newValues: { name: 'John Doe' },
      changedFields: ['name'],
      userId,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      tableName: 'payments',
      recordId: '550e8400-e29b-41d4-a716-446655440011',
      action: 'UPDATE',
      oldValues: { amount: 100 },
      newValues: { amount: 150 },
      changedFields: ['amount'],
      userId,
      ipAddress: '192.168.1.2',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByUserId: async function (requestedUserId: string) {
        return mockAuditLogs.filter(function (log) {
          return log.userId === requestedUserId
        })
      },
    }
    service = new GetAuditLogsByUserService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all audit logs for a user', async function () {
      const result = await service.execute({ userId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data.every((log) => log.userId === userId)).toBe(true)
      }
    })

    it('should return empty array when user has no audit logs', async function () {
      const result = await service.execute({ userId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
