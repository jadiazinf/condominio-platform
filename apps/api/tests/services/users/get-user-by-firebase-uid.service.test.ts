import { describe, it, expect, beforeEach } from 'bun:test'
import type { TUser } from '@packages/domain'
import { GetUserByFirebaseUidService } from '@src/services/users'

type TMockRepository = {
  getByFirebaseUid: (firebaseUid: string) => Promise<TUser | null>
}

describe('GetUserByFirebaseUidService', function () {
  let service: GetUserByFirebaseUidService
  let mockRepository: TMockRepository

  const mockUser: TUser = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    firebaseUid: 'firebase-uid-001',
    email: 'test@example.com',
    displayName: 'Test User',
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
      getByFirebaseUid: async function (firebaseUid: string) {
        if (firebaseUid === 'firebase-uid-001') {
          return mockUser
        }
        return null
      },
    }
    service = new GetUserByFirebaseUidService(mockRepository as never)
  })

  describe('execute', function () {
    it('should return user when found by firebase uid', async function () {
      const result = await service.execute({ firebaseUid: 'firebase-uid-001' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.firebaseUid).toBe('firebase-uid-001')
        expect(result.data.id).toBe(mockUser.id)
      }
    })

    it('should return NOT_FOUND error when user does not exist', async function () {
      const result = await service.execute({ firebaseUid: 'nonexistent-uid' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('User not found')
      }
    })
  })
})
