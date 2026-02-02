import { describe, it, expect, beforeEach } from 'bun:test'
import type { TPaginatedResponse } from '@packages/domain'
import { ListAllUsersPaginatedService } from '@src/services/users'
import type { TUserWithRoles, TAllUsersQuery } from '@database/repositories'

type TMockRepository = {
  listAllUsersPaginated: (query: TAllUsersQuery) => Promise<TPaginatedResponse<TUserWithRoles>>
}

describe('ListAllUsersPaginatedService', function () {
  let service: ListAllUsersPaginatedService
  let mockRepository: TMockRepository

  const mockUsers: TUserWithRoles[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'user1@example.com',
      displayName: 'User One',
      firstName: 'User',
      lastName: 'One',
      photoUrl: null,
      phoneCountryCode: '+58',
      phoneNumber: '1234567890',
      idDocumentType: 'CI',
      idDocumentNumber: '12345678',
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date(),
      roles: [
        {
          id: 'role-1',
          roleId: 'role-id-1',
          roleName: 'SUPERADMIN',
          condominiumId: null,
          condominiumName: null,
          isActive: true,
        },
      ],
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      email: 'user2@example.com',
      displayName: 'User Two',
      firstName: 'User',
      lastName: 'Two',
      photoUrl: null,
      phoneCountryCode: '+58',
      phoneNumber: '0987654321',
      idDocumentType: 'CI',
      idDocumentNumber: '87654321',
      isActive: false,
      lastLogin: null,
      createdAt: new Date(),
      roles: [
        {
          id: 'role-2',
          roleId: 'role-id-2',
          roleName: 'RESIDENTE',
          condominiumId: 'condo-1',
          condominiumName: 'Test Condo',
          isActive: true,
        },
      ],
    },
  ]

  const mockPaginatedResponse: TPaginatedResponse<TUserWithRoles> = {
    data: mockUsers,
    pagination: {
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    },
  }

  beforeEach(function () {
    mockRepository = {
      listAllUsersPaginated: async function (query: TAllUsersQuery) {
        let filteredUsers = [...mockUsers]

        // Filter by isActive
        if (query.isActive !== undefined) {
          filteredUsers = filteredUsers.filter(u => u.isActive === query.isActive)
        }

        // Filter by search
        if (query.search) {
          const search = query.search.toLowerCase()
          filteredUsers = filteredUsers.filter(
            u =>
              u.email.toLowerCase().includes(search) ||
              u.firstName?.toLowerCase().includes(search) ||
              u.lastName?.toLowerCase().includes(search)
          )
        }

        // Filter by roleId
        if (query.roleId) {
          filteredUsers = filteredUsers.filter(u =>
            u.roles.some(r => r.roleId === query.roleId)
          )
        }

        return {
          data: filteredUsers,
          pagination: {
            page: query.page || 1,
            limit: query.limit || 20,
            total: filteredUsers.length,
            totalPages: Math.ceil(filteredUsers.length / (query.limit || 20)),
          },
        }
      },
    }
    service = new ListAllUsersPaginatedService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return paginated users with default query', async function () {
      const result = await service.execute({ query: {} })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data.length).toBe(2)
        expect(result.data.pagination.page).toBe(1)
        expect(result.data.pagination.total).toBe(2)
      }
    })

    it('should filter users by isActive=true', async function () {
      const result = await service.execute({ query: { isActive: true } })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data.length).toBe(1)
        expect(result.data.data[0]!.email).toBe('user1@example.com')
        expect(result.data.data[0]!.isActive).toBe(true)
      }
    })

    it('should filter users by isActive=false', async function () {
      const result = await service.execute({ query: { isActive: false } })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data.length).toBe(1)
        expect(result.data.data[0]!.email).toBe('user2@example.com')
        expect(result.data.data[0]!.isActive).toBe(false)
      }
    })

    it('should filter users by search term', async function () {
      const result = await service.execute({ query: { search: 'user1' } })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data.length).toBe(1)
        expect(result.data.data[0]!.email).toBe('user1@example.com')
      }
    })

    it('should filter users by roleId', async function () {
      const result = await service.execute({ query: { roleId: 'role-id-1' } })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data.length).toBe(1)
        expect(result.data.data[0]!.roles[0]!.roleName).toBe('SUPERADMIN')
      }
    })

    it('should return empty array when no users match filters', async function () {
      const result = await service.execute({ query: { search: 'nonexistent' } })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data.length).toBe(0)
        expect(result.data.pagination.total).toBe(0)
      }
    })

    it('should handle custom pagination', async function () {
      const result = await service.execute({ query: { page: 1, limit: 1 } })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.pagination.page).toBe(1)
        expect(result.data.pagination.limit).toBe(1)
      }
    })

    it('should handle repository errors gracefully', async function () {
      mockRepository.listAllUsersPaginated = async () => {
        throw new Error('Database connection failed')
      }

      const result = await service.execute({ query: {} })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('INTERNAL_ERROR')
        expect(result.error).toBe('Database connection failed')
      }
    })
  })
})
