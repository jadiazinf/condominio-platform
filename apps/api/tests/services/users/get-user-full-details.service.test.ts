import { describe, it, expect, beforeEach } from 'bun:test'
import { ESystemRole } from '@packages/domain'
import { GetUserFullDetailsService } from '@src/services/users'
import type { TUserFullDetails } from '@database/repositories'

type TMockRepository = {
  getUserFullDetails: (userId: string) => Promise<TUserFullDetails | null>
}

describe('GetUserFullDetailsService', function () {
  let service: GetUserFullDetailsService
  let mockRepository: TMockRepository

  const mockSuperadminUser: TUserFullDetails = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'superadmin@example.com',
    displayName: 'Super Admin',
    firstName: 'Super',
    lastName: 'Admin',
    photoUrl: null,
    phoneCountryCode: '+58',
    phoneNumber: '1234567890',
    address: '123 Test Street',
    idDocumentType: 'V',
    idDocumentNumber: '12345678',
    isActive: true,
    isEmailVerified: true,
    lastLogin: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    userRoles: [
      {
        id: 'user-role-1',
        roleId: 'role-1',
        roleName: ESystemRole.SUPERADMIN,
        roleDescription: 'Super Administrator',
        isSystemRole: true,
        condominiumId: null,
        condominiumName: null,
        buildingId: null,
        isActive: true,
        assignedAt: new Date(),
        notes: null,
      },
    ],
    isSuperadmin: true,
    superadminPermissions: [
      { id: 'perm-1', permissionId: 'perm-1', module: 'platform_superadmins', action: 'read', description: 'View superadmins', isEnabled: true },
      { id: 'perm-2', permissionId: 'perm-2', module: 'platform_superadmins', action: 'write', description: 'Manage superadmins', isEnabled: true },
      { id: 'perm-3', permissionId: 'perm-3', module: 'management_companies', action: 'read', description: 'View companies', isEnabled: true },
    ],
    condominiums: null, // Superadmins don't have condominiums
  }

  const mockRegularUser: TUserFullDetails = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'resident@example.com',
    displayName: 'Resident User',
    firstName: 'Resident',
    lastName: 'User',
    photoUrl: null,
    phoneCountryCode: '+58',
    phoneNumber: '0987654321',
    address: '456 Test Avenue',
    idDocumentType: 'V',
    idDocumentNumber: '87654321',
    isActive: true,
    isEmailVerified: true,
    lastLogin: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    userRoles: [
      {
        id: 'user-role-2',
        roleId: 'role-2',
        roleName: 'RESIDENTE',
        roleDescription: 'Resident',
        isSystemRole: true,
        condominiumId: 'condo-1',
        condominiumName: 'Test Condo',
        buildingId: 'building-1',
        isActive: true,
        assignedAt: new Date(),
        notes: null,
      },
    ],
    isSuperadmin: false,
    superadminPermissions: null, // Regular users don't have superadmin permissions
    condominiums: [
      {
        id: 'condo-1',
        name: 'Test Condo',
        code: 'TC001',
        roles: [
          {
            userRoleId: 'user-role-2',
            roleId: 'role-2',
            roleName: 'RESIDENTE',
            isActive: true,
          },
        ],
      },
    ],
  }

  beforeEach(function () {
    mockRepository = {
      getUserFullDetails: async function (userId: string) {
        if (userId === mockSuperadminUser.id) {
          return mockSuperadminUser
        }
        if (userId === mockRegularUser.id) {
          return mockRegularUser
        }
        return null
      },
    }
    service = new GetUserFullDetailsService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return full details for a superadmin user', async function () {
      const result = await service.execute({ userId: mockSuperadminUser.id })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(mockSuperadminUser.id)
        expect(result.data.isSuperadmin).toBe(true)
        expect(result.data.superadminPermissions).not.toBeNull()
        expect(result.data.superadminPermissions?.length).toBeGreaterThan(0)
        expect(result.data.condominiums).toBeNull()
      }
    })

    it('should return full details for a regular user', async function () {
      const result = await service.execute({ userId: mockRegularUser.id })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(mockRegularUser.id)
        expect(result.data.isSuperadmin).toBe(false)
        expect(result.data.superadminPermissions).toBeNull()
        expect(result.data.condominiums).not.toBeNull()
        expect(result.data.condominiums?.length).toBeGreaterThan(0)
      }
    })

    it('should include user roles for superadmin', async function () {
      const result = await service.execute({ userId: mockSuperadminUser.id })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.userRoles.length).toBe(1)
        expect(result.data.userRoles[0]!.roleName).toBe('SUPERADMIN')
        expect(result.data.userRoles[0]!.isSystemRole).toBe(true)
      }
    })

    it('should include user roles with condominium info for regular user', async function () {
      const result = await service.execute({ userId: mockRegularUser.id })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.userRoles.length).toBe(1)
        expect(result.data.userRoles[0]!.roleName).toBe('RESIDENTE')
        expect(result.data.userRoles[0]!.condominiumId).toBe('condo-1')
        expect(result.data.userRoles[0]!.condominiumName).toBe('Test Condo')
      }
    })

    it('should return NOT_FOUND when user does not exist', async function () {
      const result = await service.execute({ userId: 'nonexistent-id' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('User not found')
      }
    })

    it('should handle repository errors gracefully', async function () {
      mockRepository.getUserFullDetails = async () => {
        throw new Error('Database connection failed')
      }

      const result = await service.execute({ userId: mockSuperadminUser.id })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('INTERNAL_ERROR')
        expect(result.error).toBe('Database connection failed')
      }
    })

    it('should return correct permissions structure for superadmin', async function () {
      const result = await service.execute({ userId: mockSuperadminUser.id })

      expect(result.success).toBe(true)
      if (result.success && result.data.superadminPermissions) {
        const permissions = result.data.superadminPermissions
        expect(permissions.some(p => p.module === 'platform_superadmins')).toBe(true)
        expect(permissions.some(p => p.action === 'read')).toBe(true)
        expect(permissions.some(p => p.action === 'write')).toBe(true)
      }
    })

    it('should return correct condominiums structure for regular user', async function () {
      const result = await service.execute({ userId: mockRegularUser.id })

      expect(result.success).toBe(true)
      if (result.success && result.data.condominiums) {
        const condominiums = result.data.condominiums
        expect(condominiums[0]!.id).toBe('condo-1')
        expect(condominiums[0]!.name).toBe('Test Condo')
        expect(condominiums[0]!.roles.length).toBe(1)
        expect(condominiums[0]!.roles[0]!.roleName).toBe('RESIDENTE')
      }
    })
  })
})
