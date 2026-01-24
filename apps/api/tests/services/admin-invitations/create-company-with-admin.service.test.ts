import { describe, it, expect, beforeEach } from 'bun:test'
import type {
  TAdminInvitation,
  TUser,
  TUserCreate,
  TManagementCompany,
  TManagementCompanyCreate,
} from '@packages/domain'
import { CreateCompanyWithAdminService } from '@src/services/admin-invitations'

type TMockInvitationsRepository = {
  create: (data: unknown) => Promise<TAdminInvitation>
}

type TMockUsersRepository = {
  getByEmail: (email: string) => Promise<TUser | null>
  create: (data: TUserCreate) => Promise<TUser>
}

type TMockCompaniesRepository = {
  create: (data: TManagementCompanyCreate) => Promise<TManagementCompany>
}

describe('CreateCompanyWithAdminService', function () {
  let service: CreateCompanyWithAdminService
  let mockInvitationsRepository: TMockInvitationsRepository
  let mockUsersRepository: TMockUsersRepository
  let mockCompaniesRepository: TMockCompaniesRepository
  let existingUser: TUser | null

  const creatorId = '550e8400-e29b-41d4-a716-446655440099'

  const companyInput: Omit<TManagementCompanyCreate, 'createdBy' | 'isActive'> = {
    name: 'New Company',
    legalName: 'New Company S.A.',
    taxIdType: 'J',
    taxIdNumber: '12345678-9',
    email: 'company@example.com',
    phoneCountryCode: '+58',
    phone: '1234567890',
    website: null,
    address: null,
    locationId: null,
    logoUrl: null,
    metadata: null,
  }

  const adminInput: Omit<TUserCreate, 'firebaseUid' | 'isActive' | 'isEmailVerified'> = {
    email: 'newadmin@example.com',
    displayName: 'New Admin',
    phoneCountryCode: '+58',
    phoneNumber: '9876543210',
    photoUrl: null,
    firstName: 'New',
    lastName: 'Admin',
    idDocumentType: null,
    idDocumentNumber: null,
    address: null,
    locationId: null,
    preferredLanguage: 'es',
    preferredCurrencyId: null,
    lastLogin: null,
    metadata: null,
  }

  beforeEach(function () {
    existingUser = null

    mockUsersRepository = {
      getByEmail: async function () {
        return existingUser
      },
      create: async function (data: TUserCreate) {
        return {
          id: '550e8400-e29b-41d4-a716-446655440001',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      },
    }

    mockCompaniesRepository = {
      create: async function (data: TManagementCompanyCreate) {
        return {
          id: '550e8400-e29b-41d4-a716-446655440002',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as TManagementCompany
      },
    }

    mockInvitationsRepository = {
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

    service = new CreateCompanyWithAdminService(
      mockInvitationsRepository as never,
      mockUsersRepository as never,
      mockCompaniesRepository as never
    )
  })

  describe('execute', function () {
    it('should create company with admin successfully', async function () {
      const result = await service.execute({
        company: companyInput,
        admin: adminInput,
        createdBy: creatorId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // Verify company
        expect(result.data.company.id).toBeDefined()
        expect(result.data.company.name).toBe(companyInput.name)
        expect(result.data.company.isActive).toBe(false)

        // Verify admin user
        expect(result.data.admin.id).toBeDefined()
        expect(result.data.admin.email).toBe(adminInput.email)
        expect(result.data.admin.isActive).toBe(false)
        expect(result.data.admin.isEmailVerified).toBe(false)
        expect(result.data.admin.firebaseUid).toContain('pending_')

        // Verify invitation
        expect(result.data.invitation.id).toBeDefined()
        expect(result.data.invitation.status).toBe('pending')
        expect(result.data.invitation.userId).toBe(result.data.admin.id)
        expect(result.data.invitation.managementCompanyId).toBe(result.data.company.id)

        // Verify token is returned
        expect(result.data.invitationToken).toBeDefined()
        expect(result.data.invitationToken.length).toBeGreaterThan(0)
      }
    })

    it('should create with custom expiration days', async function () {
      const result = await service.execute({
        company: companyInput,
        admin: adminInput,
        createdBy: creatorId,
        expirationDays: 30,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        const now = new Date()
        const expectedExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        const actualExpiry = result.data.invitation.expiresAt
        // Allow 1 minute tolerance
        expect(actualExpiry.getTime()).toBeGreaterThan(expectedExpiry.getTime() - 60000)
        expect(actualExpiry.getTime()).toBeLessThan(expectedExpiry.getTime() + 60000)
      }
    })

    it('should return CONFLICT when email belongs to active user', async function () {
      existingUser = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        firebaseUid: 'existing-uid',
        email: adminInput.email,
        displayName: 'Existing User',
        phoneCountryCode: '+58',
        phoneNumber: '1234567890',
        photoUrl: null,
        firstName: 'Existing',
        lastName: 'User',
        idDocumentType: null,
        idDocumentNumber: null,
        address: null,
        locationId: null,
        preferredLanguage: 'es',
        preferredCurrencyId: null,
        isActive: true,
        isEmailVerified: true,
        lastLogin: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await service.execute({
        company: companyInput,
        admin: adminInput,
        createdBy: creatorId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('CONFLICT')
        expect(result.error).toContain('already exists')
        expect(result.error).toContain('existing user option')
      }
    })

    it('should return CONFLICT when email belongs to pending user', async function () {
      existingUser = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        firebaseUid: 'pending_temp',
        email: adminInput.email,
        displayName: 'Pending User',
        phoneCountryCode: '+58',
        phoneNumber: '1234567890',
        photoUrl: null,
        firstName: 'Pending',
        lastName: 'User',
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

      const result = await service.execute({
        company: companyInput,
        admin: adminInput,
        createdBy: creatorId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('CONFLICT')
        expect(result.error).toContain('pending user')
        expect(result.error).toContain('already exists')
      }
    })

    it('should generate secure token for invitation', async function () {
      const result = await service.execute({
        company: companyInput,
        admin: adminInput,
        createdBy: creatorId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // Token should be base64url encoded (contains only alphanumeric, -, _)
        expect(result.data.invitationToken).toMatch(/^[A-Za-z0-9_-]+$/)
        // Token should be reasonably long (default is 32 bytes -> ~43 chars in base64url)
        expect(result.data.invitationToken.length).toBeGreaterThanOrEqual(40)
      }
    })
  })
})
