import { describe, it, expect, beforeEach } from 'bun:test'
import { GetAllRolesService, type IRoleOption } from '@src/services/users'

type TMockRepository = {
  getAllRoles: () => Promise<IRoleOption[]>
}

describe('GetAllRolesService', function () {
  let service: GetAllRolesService
  let mockRepository: TMockRepository

  const mockRoles: IRoleOption[] = [
    {
      id: 'role-1',
      name: 'SUPERADMIN',
      isSystemRole: true,
    },
    {
      id: 'role-2',
      name: 'ADMINISTRADOR',
      isSystemRole: true,
    },
    {
      id: 'role-3',
      name: 'RESIDENTE',
      isSystemRole: true,
    },
    {
      id: 'role-4',
      name: 'Custom Role',
      isSystemRole: false,
    },
  ]

  beforeEach(function () {
    mockRepository = {
      getAllRoles: async function () {
        return mockRoles
      },
    }
    service = new GetAllRolesService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return all roles', async function () {
      const result = await service.execute()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.length).toBe(4)
        expect(result.data[0]!.name).toBe('SUPERADMIN')
        expect(result.data[0]!.isSystemRole).toBe(true)
      }
    })

    it('should include both system and custom roles', async function () {
      const result = await service.execute()

      expect(result.success).toBe(true)
      if (result.success) {
        const systemRoles = result.data.filter(r => r.isSystemRole)
        const customRoles = result.data.filter(r => !r.isSystemRole)

        expect(systemRoles.length).toBe(3)
        expect(customRoles.length).toBe(1)
        expect(customRoles[0]!.name).toBe('Custom Role')
      }
    })

    it('should return empty array when no roles exist', async function () {
      mockRepository.getAllRoles = async () => []

      const result = await service.execute()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.length).toBe(0)
      }
    })

    it('should handle repository errors gracefully', async function () {
      mockRepository.getAllRoles = async () => {
        throw new Error('Database connection failed')
      }

      const result = await service.execute()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('INTERNAL_ERROR')
        expect(result.error).toBe('Database connection failed')
      }
    })
  })
})
