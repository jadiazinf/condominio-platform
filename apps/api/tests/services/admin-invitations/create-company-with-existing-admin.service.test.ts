import { describe, it, expect, beforeEach } from 'bun:test'
import type {
  TUser,
  TUserRole,
  TManagementCompany,
  TManagementCompanyCreate,
  TManagementCompanyMember,
  TManagementCompanySubscription,
  TRole,
} from '@packages/domain'
import { CreateCompanyWithExistingAdminService } from '@src/services/admin-invitations'

type TMockUsersRepository = {
  getById: (id: string) => Promise<TUser | null>
}

type TMockCompaniesRepository = {
  create: (data: TManagementCompanyCreate) => Promise<TManagementCompany | null>
  withTx: (tx: unknown) => TMockCompaniesRepository
}

type TMockMembersRepository = {
  create: (data: unknown) => Promise<TManagementCompanyMember | null>
  withTx: (tx: unknown) => TMockMembersRepository
}

type TMockSubscriptionsRepository = {
  create: (data: unknown) => Promise<TManagementCompanySubscription | null>
  withTx: (tx: unknown) => TMockSubscriptionsRepository
}

type TMockUserRolesRepository = {
  create: (data: any) => Promise<TUserRole>
  getByUserAndRole: (userId: string, roleId: string, condominiumId: string | null) => Promise<TUserRole[]>
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
  let mockUsersRepository: TMockUsersRepository
  let mockCompaniesRepository: TMockCompaniesRepository
  let mockMembersRepository: TMockMembersRepository
  let mockSubscriptionsRepository: TMockSubscriptionsRepository
  let mockUserRolesRepository: TMockUserRolesRepository
  let mockRolesRepository: TMockRolesRepository
  let existingUser: TUser | null
  let companyCreateResult: TManagementCompany | null
  let memberCreateResult: TManagementCompanyMember | null
  let subscriptionCreateResult: TManagementCompanySubscription | null

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

  const userRoleId = '550e8400-e29b-41d4-a716-446655440020'
  const mockUserRole: TRole = {
    id: '550e8400-e29b-41d4-a716-446655440030',
    name: 'USER',
    description: 'Standard user role',
    isSystemRole: true,
    registeredBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  let lastMemberCreateData: unknown = null
  let lastSubscriptionCreateData: unknown = null

  beforeEach(function () {
    existingUser = activeUser
    lastMemberCreateData = null
    lastSubscriptionCreateData = null

    companyCreateResult = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      ...companyInput,
      createdBy: creatorId,
      isActive: true,
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
      joinedAt: new Date(),
      invitedAt: new Date(),
      invitedBy: creatorId,
      isActive: true,
      deactivatedAt: null,
      deactivatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as TManagementCompanyMember

    subscriptionCreateResult = {
      id: '550e8400-e29b-41d4-a716-446655440011',
      managementCompanyId: '550e8400-e29b-41d4-a716-446655440002',
      subscriptionName: 'Trial Subscription',
      billingCycle: 'monthly',
      basePrice: 0,
      currencyId: null,
      maxCondominiums: 9999,
      maxUnits: 999999,
      maxUsers: 9999,
      maxStorageGb: 9999,
      customFeatures: null,
      customRules: null,
      status: 'trial',
      startDate: new Date(),
      endDate: null,
      nextBillingDate: new Date(),
      trialEndsAt: new Date(),
      autoRenew: false,
      notes: 'Automatically created trial subscription',
      createdBy: creatorId,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      pricingCondominiumCount: null,
      pricingUnitCount: null,
      pricingCondominiumRate: null,
      pricingUnitRate: null,
      calculatedPrice: null,
      discountType: null,
      discountValue: null,
      discountAmount: null,
      pricingNotes: null,
      rateId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as TManagementCompanySubscription

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
      withTx() { return this },
    }

    mockMembersRepository = {
      create: async function (data: unknown) {
        lastMemberCreateData = data
        return memberCreateResult
      },
      withTx() { return this },
    }

    mockSubscriptionsRepository = {
      create: async function (data: unknown) {
        lastSubscriptionCreateData = data
        return subscriptionCreateResult
      },
      withTx() { return this },
    }

    mockUserRolesRepository = {
      create: async function (data: any) {
        return {
          id: userRoleId,
          userId: data.userId,
          roleId: data.roleId,
          condominiumId: data.condominiumId,
          buildingId: data.buildingId,
          isActive: data.isActive,
          notes: data.notes,
          assignedAt: new Date(),
          assignedBy: data.assignedBy,
          registeredBy: data.registeredBy,
          expiresAt: data.expiresAt,
        }
      },
      getByUserAndRole: async function () {
        return [] // No existing role by default
      },
      withTx() { return this },
    }

    mockRolesRepository = {
      getByName: async function (name: string) {
        if (name === 'USER') return mockUserRole
        return null
      },
    }

    service = new CreateCompanyWithExistingAdminService(
      mockDb,
      mockUsersRepository as never,
      mockCompaniesRepository as never,
      mockMembersRepository as never,
      mockSubscriptionsRepository as never,
      mockUserRolesRepository as never,
      mockRolesRepository as never
    )
  })

  describe('execute', function () {
    it('should create company with existing admin successfully', async function () {
      const result = await service.execute({
        company: companyInput,
        existingUserId,
        createdBy: creatorId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // Verify company is active
        expect(result.data.company).toBeDefined()
        expect(result.data.company.isActive).toBe(true)
        expect(result.data.company.name).toBe(companyInput.name)

        // Verify admin is the existing user
        expect(result.data.admin).toBeDefined()
        expect(result.data.admin.id).toBe(existingUserId)
        expect(result.data.admin.isActive).toBe(true)

        // Verify member was created
        expect(result.data.member).toBeDefined()
        expect(result.data.member.isPrimaryAdmin).toBe(true)
        expect(result.data.member.roleName).toBe('admin')

        // Verify subscription was created
        expect(result.data.subscription).toBeDefined()
        expect(result.data.subscription.status).toBe('trial')

        // Verify user role was assigned
        expect(result.data.userRole).toBeDefined()
        expect(result.data.userRole.userId).toBe(existingUserId)
        expect(result.data.userRole.roleId).toBe(mockUserRole.id)
        expect(result.data.userRole.isActive).toBe(true)
        expect(result.data.userRole.condominiumId).toBeNull()
      }
    })

    it('should reuse existing user role if user already has USER role', async function () {
      const existingUserRole: TUserRole = {
        id: '550e8400-e29b-41d4-a716-446655440040',
        userId: existingUserId,
        roleId: mockUserRole.id,
        condominiumId: null,
        buildingId: null,
        isActive: true,
        notes: 'Previously assigned',
        assignedAt: new Date(),
        assignedBy: creatorId,
        registeredBy: creatorId,
        expiresAt: null,
      }

      mockUserRolesRepository.getByUserAndRole = async function () {
        return [existingUserRole]
      }

      const result = await service.execute({
        company: companyInput,
        existingUserId,
        createdBy: creatorId,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // Should reuse the existing role, not create a new one
        expect(result.data.userRole.id).toBe(existingUserRole.id)
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

    it('should return INTERNAL_ERROR when subscription creation fails', async function () {
      subscriptionCreateResult = null

      const result = await service.execute({
        company: companyInput,
        existingUserId,
        createdBy: creatorId,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('INTERNAL_ERROR')
        expect(result.error).toContain('subscription')
      }
    })

    it('should create member with full admin permissions', async function () {
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
      expect(memberData.isActive).toBe(true)

      const permissions = memberData.permissions as Record<string, boolean>
      expect(permissions.can_change_subscription).toBe(true)
      expect(permissions.can_manage_members).toBe(true)
      expect(permissions.can_create_tickets).toBe(true)
      expect(permissions.can_view_invoices).toBe(true)
    })

    it('should create trial subscription with 30-day period', async function () {
      const before = new Date()

      const result = await service.execute({
        company: companyInput,
        existingUserId,
        createdBy: creatorId,
      })

      expect(result.success).toBe(true)

      // Verify the data passed to subscriptionsRepository.create
      const subData = lastSubscriptionCreateData as Record<string, unknown>
      expect(subData).toBeDefined()
      expect(subData.status).toBe('trial')
      expect(subData.basePrice).toBe(0)
      expect(subData.autoRenew).toBe(false)
      expect(subData.subscriptionName).toBe('Trial Subscription')

      // Verify trialEndsAt is approximately 30 days from now
      const trialEndsAt = subData.trialEndsAt as Date
      const expectedEnd = new Date(before.getTime() + 30 * 24 * 60 * 60 * 1000)
      // Allow 1 minute tolerance
      expect(trialEndsAt.getTime()).toBeGreaterThan(expectedEnd.getTime() - 60000)
      expect(trialEndsAt.getTime()).toBeLessThan(expectedEnd.getTime() + 60000)
    })
  })
})
