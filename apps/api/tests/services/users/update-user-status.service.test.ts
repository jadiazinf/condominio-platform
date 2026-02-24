import { describe, it, expect, beforeEach } from 'bun:test'
import type { TUser } from '@packages/domain'
import { UpdateUserStatusService } from '@src/services/users'

type TMockRepository = {
  updateStatus: (id: string, isActive: boolean) => Promise<TUser | null>
}

describe('UpdateUserStatusService', function () {
  let service: UpdateUserStatusService
  let mockRepository: TMockRepository

  const mockUser: TUser = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    firebaseUid: 'firebase-uid-001',
    email: 'test@example.com',
    displayName: 'Test User',
    phoneCountryCode: '+58',
    phoneNumber: '1234567890',
    photoUrl: null,
    firstName: 'Test',
    lastName: 'User',
    idDocumentType: 'V',
    idDocumentNumber: '12345678',
    address: '123 Test Street',
    locationId: null,
    preferredLanguage: 'es',
    preferredCurrencyId: null,
    isActive: true,
    isEmailVerified: true,
    lastLogin: new Date(),
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(function () {
    mockRepository = {
      updateStatus: async function (id: string, isActive: boolean) {
        if (id === mockUser.id) {
          return { ...mockUser, isActive }
        }
        return null
      },
    }
    service = new UpdateUserStatusService(mockRepository as never)
  })

  describe('execute', function () {
    it('should deactivate an active user', async function () {
      const result = await service.execute({
        userId: mockUser.id,
        isActive: false,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(mockUser.id)
        expect(result.data.isActive).toBe(false)
      }
    })

    it('should activate an inactive user', async function () {
      const result = await service.execute({
        userId: mockUser.id,
        isActive: true,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(mockUser.id)
        expect(result.data.isActive).toBe(true)
      }
    })

    it('should return NOT_FOUND when user does not exist', async function () {
      const result = await service.execute({
        userId: 'nonexistent-id',
        isActive: false,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('User not found')
      }
    })

    it('should handle repository errors gracefully', async function () {
      mockRepository.updateStatus = async () => {
        throw new Error('Database connection failed')
      }

      const result = await service.execute({
        userId: mockUser.id,
        isActive: false,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('INTERNAL_ERROR')
        expect(result.error).toBe('Database connection failed')
      }
    })
  })
})
