import { describe, it, expect, beforeEach } from 'bun:test'
import {
  type TAdminInvitation,
  type TUser,
  type TUserRole,
  type TManagementCompany,
  type TManagementCompanyCreate,
  type TManagementCompanyMember,
  type TRole,
  ESystemRole,
} from '@packages/domain'
import { CreateCompanyWithExistingAdminService } from '@src/services/admin-invitations'

type TMockInvitationsRepository = {
  create: (data: unknown) => Promise<TAdminInvitation>
  withTx: (tx: unknown) => TMockInvitationsRepository
}

type TMockUsersRepository = {
  getById: (id: string) => Promise<TUser | null>
}

type TMockCompaniesRepository = {
  create: (data: TManagementCompanyCreate) => Promise<TManagementCompany | null>
  getByEmail: (email: string) => Promise<TManagementCompany | null>
  withTx: (tx: unknown) => TMockCompaniesRepository
}

type TMockMembersRepository = {
  create: (data: unknown) => Promise<TManagementCompanyMember | null>
  withTx: (tx: unknown) => TMockMembersRepository
}

type TMockUserRolesRepository = {
  createManagementCompanyRole: (
    userId: string,
    roleId: string,
    managementCompanyId: string,
    assignedBy?: string
  ) => Promise<TUserRole>
  update: (id: string, data: unknown) => Promise<TUserRole>
  withTx: (tx: unknown) => TMockUserRolesRepository
}

type TMockRolesRepository = {
  getByName: (name: string) => Promise<TRole | null>
}

// Mock db that executes the transaction callback immediately (no real DB)
const mockDb = {
  transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
} as never

describe('CreateCompanyWithExistingAdminService', function () {
  let service: CreateCompanyWithExistingAdminService
  let mockInvitationsRepository: TMockInvitationsRepository
  let mockUsersRepository: TMockUsersRepository
  let mockCompaniesRepository: TMockCompaniesRepository
  let mockMembersRepository: TMockMembersRepository
  let mockUserRolesRepository: TMockUserRolesRepository
  let mockRolesRepository: TMockRolesRepository
  let existingUser: TUser | null
  let companyCreateResult: TManagementCompany | null
  let memberCreateResult: TManagementCompanyMember | null

  const creatorId = '550e8400-e29b-41d4-a716-446655440099'
  const existingUserId = '550e8400-e29b-41d4-a716-446655440001'

  const activeUser: TUser = {
    id: existingUserId,
    firebaseUid: 'firebase-uid-existing',
    email: 'existing@example.com',
    displayName: 'Existing Admin',
    phoneCountryCode: '+58',
    phoneNumber: '1234567890',
    photoUrl: null,
    firstName: 'Existing',
    lastName: 'Admin',
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

  let lastMemberCreateData: unknown = null

  beforeEach(function () {
    existingUser = activeUser
    lastMemberCreateData = null

    companyCreateResult = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      ...companyInput,
      createdBy: creatorId,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as TManagementCompany

    memberCreateResult = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      managementCompanyId: '550e8400-e29b-41d4-a716-446655440002',
      userId: existingUserId,
      roleName: 'admin',
      permissions: {
        can_change_subscription: true,
        can_manage_members: true,
        can_create_tickets: true,
        can_view_invoices: true,
      },
      isPrimaryAdmin: true,
      joinedAt: null,
      invitedAt: new Date(),
      invitedBy: creatorId,
      isActive: false,
      deactivatedAt: null,
      deactivatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as TManagementCompanyMember

    mockInvitationsRepository = {
      create: async function (data: any) {
        return {
          id: '550e8400-e29b-41d4-a716-446655440070',
          userId: data.userId,
          managementCompanyId: data.managementCompanyId,
          token: data.token,
          tokenHash: data.tokenHash,
          status: 'pending',
          email: data.email,
          expiresAt: data.expiresAt,
          acceptedAt: null,
          emailError: null,
          createdBy: data.createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as TAdminInvitation
      },
      withTx() {
        return this
      },
    }

    mockUsersRepository = {
      getById: async function () {
        return existingUser
      },
    }

    mockCompaniesRepository = {
      create: async function (data: TManagementCompanyCreate) {
        if (!companyCreateResult) return null
        return {
          ...companyCreateResult,
          ...data,
        } as TManagementCompany
      },
      getByEmail: async function () {
        return null
      },
      withTx() {
        return this
      },
    }

    mockMembersRepository = {
      create: async function (data: unknown) {
        lastMemberCreateData = data
        return memberCreateResult
      },
      withTx() {
        return this
      },
    }

    const mockAdminRole: TRole = {
      id: '550e8400-e29b-41d4-a716-446655440060',
      name: ESystemRole.ADMIN,
      description: 'Admin role',
      isSystemRole: true,
      registeredBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mcRoleId = '550e8400-e29b-41d4-a716-446655440050'

    mockUserRolesRepository = {
      createManagementCompanyRole: async function (
        userId: string,
        roleId: string,
        managementCompanyId: string,
        assignedBy?: string
      ) {
        return {
          id: mcRoleId,
          userId,
          roleId,
          condominiumId: null,
          buildingId: null,
          managementCompanyId,
          isActive: true,
          notes: null,
          assignedAt: new Date(),
          assignedBy: assignedBy ?? null,
          registeredBy: assignedBy ?? null,
          expiresAt: null,
        }
      },
      update: async function (_id: string, _data: unknown) {
        return {
          id: mcRoleId,
          isActive: false,
        } as TUserRole
      },
      withTx() {
        return this
      },
    }

    mockRolesRepository = {
      getByName: async function (name: string) {
        if (name === ESystemRole.ADMIN) return mockAdminRole
        return null
      },
    }

    service = new CreateCompanyWithExistingAdminService(
      mockDb,
      mockInvitationsRepository as never,
      mockUsersRepository as never,
      mockCompaniesRepository as never,
      mockMembersRepository as never,
      mockUserRolesRepository as never,
      mockRolesRepository as never
    )
  })

  describe('execute', function () {
    it('should create company with existing admin and invitation successfully', async function () {
      const result = await service.execute({
        company: companyInput,
        existingUserId,
        createdBy: creatorId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // Company should be inactive (pending confirmation)
        expect(result.data.company).toBeDefined()
        expect(result.data.company.isActive).toBe(false)
        expect(result.data.company.name).toBe(companyInput.name)

        // Admin is the existing user
        expect(result.data.admin).toBeDefined()
        expect(result.data.admin.id).toBe(existingUserId)
        expect(result.data.admin.isActive).toBe(true)

        // Member was created (inactive)
        expect(result.data.member).toBeDefined()
        expect(result.data.member.isPrimaryAdmin).toBe(true)
        expect(result.data.member.roleName).toBe('admin')

        // Invitation was created
        expect(result.data.invitation).toBeDefined()
        expect(result.data.invitation.status).toBe('pending')
        expect(result.data.invitation.email).toBe(activeUser.email)

        // Invitation token is returned for email sending
        expect(result.data.invitationToken).toBeDefined()
        expect(result.data.invitationToken.length).toBeGreaterThan(0)
      }
    })

    it('should return NOT_FOUND when user does not exist', async function () {
      existingUser = null

      const result = await service.execute({
        company: companyInput,
        existingUserId,
        createdBy: creatorId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND')
        expect(result.error).toBe('User not found')
      }
    })

    it('should return BAD_REQUEST when user is not active', async function () {
      existingUser = {
        ...activeUser,
        isActive: false,
      }

      const result = await service.execute({
        company: companyInput,
        existingUserId,
        createdBy: creatorId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('BAD_REQUEST')
        expect(result.error).toContain('not active')
      }
    })

    it('should return INTERNAL_ERROR when company creation fails', async function () {
      companyCreateResult = null

      const result = await service.execute({
        company: companyInput,
        existingUserId,
        createdBy: creatorId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('INTERNAL_ERROR')
        expect(result.error).toContain('management company')
      }
    })

    it('should return INTERNAL_ERROR when member creation fails', async function () {
      memberCreateResult = null

      const result = await service.execute({
        company: companyInput,
        existingUserId,
        createdBy: creatorId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('INTERNAL_ERROR')
        expect(result.error).toContain('member')
      }
    })

    it('should create member as inactive with admin permissions', async function () {
      const result = await service.execute({
        company: companyInput,
        existingUserId,
        createdBy: creatorId,
      })

      expect(result.success).toBe(true)

      // Verify the data passed to membersRepository.create
      const memberData = lastMemberCreateData as Record<string, unknown>
      expect(memberData).toBeDefined()
      expect(memberData.isPrimaryAdmin).toBe(true)
      expect(memberData.roleName).toBe('admin')
      expect(memberData.isActive).toBe(false)
      expect(memberData.joinedAt).toBeNull()

      const permissions = memberData.permissions as Record<string, boolean>
      expect(permissions.can_change_subscription).toBe(true)
      expect(permissions.can_manage_members).toBe(true)
      expect(permissions.can_create_tickets).toBe(true)
      expect(permissions.can_view_invoices).toBe(true)
    })
  })
})
