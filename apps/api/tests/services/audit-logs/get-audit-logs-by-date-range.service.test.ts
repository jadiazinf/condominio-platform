import { describe, it, expect, beforeEach } from 'bun:test'
import type { TAuditLog } from '@packages/domain'
import { GetAuditLogsByDateRangeService } from '@src/services/audit-logs'

type TMockRepository = {
  getByDateRange: (startDate: Date, endDate: Date) => Promise<TAuditLog[]>
}

describe('GetAuditLogsByDateRangeService', function () {
  let service: GetAuditLogsByDateRangeService
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
      createdAt: new Date('2024-01-15'),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      tableName: 'payments',
      recordId: '550e8400-e29b-41d4-a716-446655440011',
      action: 'UPDATE',
      oldValues: { amount: 100 },
      newValues: { amount: 150 },
      changedFields: ['amount'],
      userId: '550e8400-e29b-41d4-a716-446655440020',
      ipAddress: '192.168.1.2',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date('2024-02-20'),
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getByDateRange: async function (startDate: Date, endDate: Date) {
        return mockAuditLogs.filter(function (log) {
          return log.createdAt >= startDate && log.createdAt <= endDate
        })
      },
    }
    service = new GetAuditLogsByDateRangeService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return audit logs within date range', async function () {
      const result = await service.execute({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        const log = result.data[0]
        expect(log).toBeDefined()
        expect(log!.id).toBe('550e8400-e29b-41d4-a716-446655440001')
      }
    })

    it('should return all audit logs when range covers all dates', async function () {
      const result = await service.execute({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
      }
    })

    it('should return empty array when no audit logs in range', async function () {
      const result = await service.execute({
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })
  })
})
