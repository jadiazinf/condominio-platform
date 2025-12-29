import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPermission } from '@packages/domain'
import { GetPermissionByModuleAndActionService } from '@src/services/permissions'

type TMockRepository = {
  getByModuleAndAction: (module: string, action: string) => Promise<TPermission | null>
}

describe('GetPermissionByModuleAndActionService', function () {
  let service: GetPermissionByModuleAndActionService
  let mockRepository: TMockRepository

  const mockPermission: TPermission = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'payments:create',
    description: 'Create payments',
    module: 'payments',
    action: 'create',
    registeredBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(function () {
    mockRepository = {
      getByModuleAndAction: async function (module: string, action: string) {
        if (module === 'payments' && action === 'create') {
          return mockPermission
        }
        return null
      },
    }
    service = new GetPermissionByModuleAndActionService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return permission when found', async function () {
      const result = await service.execute({ module: 'payments', action: 'create' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(mockPermission.id)
        expect(result.data.module).toBe('payments')
        expect(result.data.action).toBe('create')
        expect(result.data.name).toBe('payments:create')
      }
    })

    it('should return NOT_FOUND error when permission does not exist', async function () {
      const result = await service.execute({ module: 'payments', action: 'delete' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Permission not found')
      }
    })

    it('should return NOT_FOUND error when module does not exist', async function () {
      const result = await service.execute({ module: 'unknown', action: 'create' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Permission not found')
      }
    })
  })
})
