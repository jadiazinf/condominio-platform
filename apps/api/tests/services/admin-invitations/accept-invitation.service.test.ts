import { describe, it, expect, beforeEach } from 'bun:test'
import type { TAdminInvitation, TUser, TManagementCompany } from '@packages/domain'
import { AcceptInvitationService } from '@src/services/admin-invitations'

type TMockInvitationsRepository = {
  getByToken: (token: string) => Promise<TAdminInvitation | null>
  update: (id: string, data: Partial<TAdminInvitation>) => Promise<TAdminInvitation | null>
  markAsAccepted: (id: string) => Promise<TAdminInvitation | null>
}

type TMockUsersRepository = {
  getById: (id: string) => Promise<TUser | null>
  getByFirebaseUid: (uid: string) => Promise<TUser | null>
  update: (id: string, data: Partial<TUser>) => Promise<TUser | null>
}

type TMockCompaniesRepository = {
  getById: (id: string) => Promise<TManagementCompany | null>
  update: (id: string, data: Partial<TManagementCompany>) => Promise<TManagementCompany | null>
}

describe('AcceptInvitationService', function () {
  let service: AcceptInvitationService
  let mockInvitationsRepository: TMockInvitationsRepository
  let mockUsersRepository: TMockUsersRepository
  let mockCompaniesRepository: TMockCompaniesRepository
  let existingUserWithFirebaseUid: TUser | null

  const testUser: TUser = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    firebaseUid: 'pending_temp_uid',
    email: 'admin@example.com',
    displayName: 'Test Admin',
    phoneCountryCode: '+58',
    phoneNumber: '1234567890',
    photoUrl: null,
    firstName: 'Test',
    lastName: 'Admin',
    idDocumentType: null,
    idDocumentNumber: null,
    address: null,
    locationId: null,
    preferredLanguage: 'es',
    preferredCurrencyId: null,
    isActive: false,
    isEmailVerified: false,
    lastLogin: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const testCompany: TManagementCompany = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Test Company',
    legalName: 'Test Company S.A.',
    taxIdType: 'J',
    taxIdNumber: '12345678-9',
    email: 'company@example.com',
    phoneCountryCode: '+58',
    phone: '1234567890',
    website: null,
    address: null,
    locationId: null,
    isActive: false,
    logoUrl: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: testUser.id,
  }

  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 7)

  const pastDate = new Date()
  pastDate.setDate(pastDate.getDate() - 7)

  const pendingInvitation: TAdminInvitation = {
    id: '550e8400-e29b-41d4-a716-446655440003',
    userId: testUser.id,
    managementCompanyId: testCompany.id,
    token: 'valid-token-123',
    tokenHash: 'hash-123',
    status: 'pending',
    email: testUser.email,
    expiresAt: futureDate,
    acceptedAt: null,
    emailError: null,
    createdBy: '550e8400-e29b-41d4-a716-446655440099',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const expiredInvitation: TAdminInvitation = {
    ...pendingInvitation,
    id: '550e8400-e29b-41d4-a716-446655440004',
    token: 'expired-token-456',
    expiresAt: pastDate,
  }

  const acceptedInvitation: TAdminInvitation = {
    ...pendingInvitation,
    id: '550e8400-e29b-41d4-a716-446655440005',
    token: 'accepted-token-789',
    status: 'accepted',
    acceptedAt: new Date(),
  }

  const newFirebaseUid = 'new-firebase-uid-12345'

  beforeEach(function () {
    existingUserWithFirebaseUid = null

    mockUsersRepository = {
      getById: async function (id: string) {
        if (id === testUser.id) return testUser
        return null
      },
      getByFirebaseUid: async function () {
        return existingUserWithFirebaseUid
      },
      update: async function (id: string, data: Partial<TUser>) {
        if (id === testUser.id) {
          return {
            ...testUser,
            ...data,
          }
        }
        return null
      },
    }

    mockCompaniesRepository = {
      getById: async function (id: string) {
        if (id === testCompany.id) return testCompany
        return null
      },
      update: async function (id: string, data: Partial<TManagementCompany>) {
        if (id === testCompany.id) {
          return {
            ...testCompany,
            ...data,
          }
        }
        return null
      },
    }

    mockInvitationsRepository = {
      getByToken: async function (token: string) {
        if (token === pendingInvitation.token) return pendingInvitation
        if (token === expiredInvitation.token) return expiredInvitation
        if (token === acceptedInvitation.token) return acceptedInvitation
        return null
      },
      update: async function (id: string, data: Partial<TAdminInvitation>) {
        return {
          ...pendingInvitation,
          id,
          ...data,
        }
      },
      markAsAccepted: async function (id: string) {
        if (id === pendingInvitation.id) {
          return {
            ...pendingInvitation,
            status: 'accepted' as const,
            acceptedAt: new Date(),
          }
        }
        return null
      },
    }

    service = new AcceptInvitationService(
      {} as never, // db not used in mock tests
      mockInvitationsRepository as never,
      mockUsersRepository as never,
      mockCompaniesRepository as never
    )
  })

  describe('execute', function () {
    it('should accept invitation successfully', async function () {
      const result = await service.execute({
        token: pendingInvitation.token,
        firebaseUid: newFirebaseUid,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.invitation.status).toBe('accepted')
        expect(result.data.invitation.acceptedAt).toBeDefined()
        expect(result.data.user.isActive).toBe(true)
        expect(result.data.user.isEmailVerified).toBe(true)
        expect(result.data.user.firebaseUid).toBe(newFirebaseUid)
        expect(result.data.managementCompany.isActive).toBe(true)
      }
    })

    it('should return NOT_FOUND for invalid token', async function () {
      const result = await service.execute({
        token: 'nonexistent-token',
        firebaseUid: newFirebaseUid,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Invalid invitation token')
      }
    })

    it('should return BAD_REQUEST for already accepted invitation', async function () {
      const result = await service.execute({
        token: acceptedInvitation.token,
        firebaseUid: newFirebaseUid,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('already been accepted')
      }
    })

    it('should return BAD_REQUEST for expired invitation', async function () {
      const result = await service.execute({
        token: expiredInvitation.token,
        firebaseUid: newFirebaseUid,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toBe('Invitation has expired')
      }
    })

    it('should return CONFLICT if Firebase UID belongs to another user', async function () {
      existingUserWithFirebaseUid = {
        ...testUser,
        id: '550e8400-e29b-41d4-a716-446655440999', // Different user ID
        firebaseUid: newFirebaseUid,
      }

      const result = await service.execute({
        token: pendingInvitation.token,
        firebaseUid: newFirebaseUid,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('CONFLICT')
        expect(result.error).toContain('already linked to another user')
      }
    })

    it('should allow same user to use same Firebase UID', async function () {
      // Same user already has this Firebase UID (edge case)
      existingUserWithFirebaseUid = testUser

      const result = await service.execute({
        token: pendingInvitation.token,
        firebaseUid: newFirebaseUid,
      })

      expect(result.success).toBe(true)
    })
  })
})
