import { describe, it, expect, beforeEach } from 'bun:test'
import type { TUser } from '@packages/domain'
import { UpdateLastLoginService } from '@src/services/users'

type TMockRepository = {
  updateLastLogin: (userId: string) => Promise<TUser | null>
}

describe('UpdateLastLoginService', function () {
  let service: UpdateLastLoginService
  let mockRepository: TMockRepository

  const userId = '550e8400-e29b-41d4-a716-446655440001'

  const mockUser: TUser = {
    id: userId,
    firebaseUid: 'firebase-uid-001',
    email: 'test@example.com',
    displayName: 'Test User',
    phoneCountryCode: '+58',
    phoneNumber: '+1234567890',
    photoUrl: null,
    firstName: 'Test',
    lastName: 'User',
    idDocumentType: 'CI',
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
      updateLastLogin: async function (requestedUserId: string) {
        if (requestedUserId === userId) {
          return mockUser
        }
        return null
      },
    }
    service = new UpdateLastLoginService(mockRepository as never)
  })

  describe('execute', function () {
    it('should update and return user when found', async function () {
      const result = await service.execute({ userId })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(userId)
        expect(result.data.lastLogin).toBeDefined()
      }
    })

    it('should return NOT_FOUND error when user does not exist', async function () {
      const result = await service.execute({ userId: '550e8400-e29b-41d4-a716-446655440099' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('User not found')
      }
    })
  })
})
