import { describe, it, expect, beforeEach } from 'bun:test'
import type { TAdminInvitation, TUser, TManagementCompany } from '@packages/domain'
import { ValidateInvitationTokenService } from '@src/services/admin-invitations'

type TMockInvitationsRepository = {
  getByToken: (token: string) => Promise<TAdminInvitation | null>
}

type TMockUsersRepository = {
  getById: (id: string) => Promise<TUser | null>
}

type TMockCompaniesRepository = {
  getById: (id: string) => Promise<TManagementCompany | null>
}

describe('ValidateInvitationTokenService', function () {
  let service: ValidateInvitationTokenService
  let mockInvitationsRepository: TMockInvitationsRepository
  let mockUsersRepository: TMockUsersRepository
  let mockCompaniesRepository: TMockCompaniesRepository

  const testUser: TUser = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    firebaseUid: 'firebase-uid-123',
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

  beforeEach(function () {
    mockUsersRepository = {
      getById: async function (id: string) {
        if (id === testUser.id) return testUser
        return null
      },
    }

    mockCompaniesRepository = {
      getById: async function (id: string) {
        if (id === testCompany.id) return testCompany
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
    }

    service = new ValidateInvitationTokenService(
      mockInvitationsRepository as never,
      mockUsersRepository as never,
      mockCompaniesRepository as never
    )
  })

  describe('execute', function () {
    it('should validate pending invitation successfully', async function () {
      const result = await service.execute({ token: pendingInvitation.token })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.invitation.id).toBe(pendingInvitation.id)
        expect(result.data.user.id).toBe(testUser.id)
        expect(result.data.managementCompany.id).toBe(testCompany.id)
        expect(result.data.isExpired).toBe(false)
        expect(result.data.isValid).toBe(true)
      }
    })

    it('should return isExpired=true for expired invitation', async function () {
      const result = await service.execute({ token: expiredInvitation.token })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isExpired).toBe(true)
        expect(result.data.isValid).toBe(false)
      }
    })

    it('should return isValid=false for accepted invitation', async function () {
      const result = await service.execute({ token: acceptedInvitation.token })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isExpired).toBe(false)
        expect(result.data.isValid).toBe(false)
        expect(result.data.invitation.status).toBe('accepted')
      }
    })

    it('should return NOT_FOUND for invalid token', async function () {
      const result = await service.execute({ token: 'nonexistent-token' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Invalid invitation token')
      }
    })
  })
})
