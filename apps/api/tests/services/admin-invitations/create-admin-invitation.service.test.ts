import { describe, it, expect, beforeEach } from 'bun:test'
import type { TAdminInvitation, TUser, TManagementCompany } from '@packages/domain'
import { CreateAdminInvitationService } from '@src/services/admin-invitations'

type TMockInvitationsRepository = {
  hasPendingInvitation: (userId: string, companyId: string) => Promise<boolean>
  create: (data: unknown) => Promise<TAdminInvitation>
}

type TMockUsersRepository = {
  getById: (id: string) => Promise<TUser | null>
}

type TMockCompaniesRepository = {
  getById: (id: string) => Promise<TManagementCompany | null>
}

describe('CreateAdminInvitationService', function () {
  let service: CreateAdminInvitationService
  let mockInvitationsRepository: TMockInvitationsRepository
  let mockUsersRepository: TMockUsersRepository
  let mockCompaniesRepository: TMockCompaniesRepository
  let hasPendingInvitationResult: boolean

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

  const creatorId = '550e8400-e29b-41d4-a716-446655440099'

  beforeEach(function () {
    hasPendingInvitationResult = false

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
      hasPendingInvitation: async function () {
        return hasPendingInvitationResult
      },
      create: async function (data: unknown) {
        const d = data as Record<string, unknown>
        return {
          id: '550e8400-e29b-41d4-a716-446655440003',
          userId: d.userId as string,
          managementCompanyId: d.managementCompanyId as string,
          token: d.token as string,
          tokenHash: d.tokenHash as string,
          status: 'pending',
          email: d.email as string,
          expiresAt: d.expiresAt as Date,
          acceptedAt: null,
          emailError: null,
          createdBy: d.createdBy as string,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as TAdminInvitation
      },
    }

    service = new CreateAdminInvitationService(
      mockInvitationsRepository as never,
      mockUsersRepository as never,
      mockCompaniesRepository as never
    )
  })

  describe('execute', function () {
    it('should create invitation successfully', async function () {
      const result = await service.execute({
        userId: testUser.id,
        managementCompanyId: testCompany.id,
        email: testUser.email,
        createdBy: creatorId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.invitation).toBeDefined()
        expect(result.data.invitation.status).toBe('pending')
        expect(result.data.token).toBeDefined()
        expect(result.data.token.length).toBeGreaterThan(0)
        expect(result.data.user.id).toBe(testUser.id)
        expect(result.data.managementCompany.id).toBe(testCompany.id)
      }
    })

    it('should create invitation with custom expiration days', async function () {
      const result = await service.execute({
        userId: testUser.id,
        managementCompanyId: testCompany.id,
        email: testUser.email,
        createdBy: creatorId,
        expirationDays: 14,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        const now = new Date()
        const expectedExpiry = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
        const actualExpiry = result.data.invitation.expiresAt
        // Allow 1 minute tolerance
        expect(actualExpiry.getTime()).toBeGreaterThan(expectedExpiry.getTime() - 60000)
        expect(actualExpiry.getTime()).toBeLessThan(expectedExpiry.getTime() + 60000)
      }
    })

    it('should return NOT_FOUND when user does not exist', async function () {
      const result = await service.execute({
        userId: '550e8400-e29b-41d4-a716-446655440999',
        managementCompanyId: testCompany.id,
        email: testUser.email,
        createdBy: creatorId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('User not found')
      }
    })

    it('should return NOT_FOUND when management company does not exist', async function () {
      const result = await service.execute({
        userId: testUser.id,
        managementCompanyId: '550e8400-e29b-41d4-a716-446655440999',
        email: testUser.email,
        createdBy: creatorId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('Management company not found')
      }
    })

    it('should return CONFLICT when pending invitation already exists', async function () {
      hasPendingInvitationResult = true

      const result = await service.execute({
        userId: testUser.id,
        managementCompanyId: testCompany.id,
        email: testUser.email,
        createdBy: creatorId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('CONFLICT')
        expect(result.error).toContain('active invitation already exists')
      }
    })
  })
})
