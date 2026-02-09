import type {
  TUser,
  TManagementCompany,
  TManagementCompanyCreate,
  TManagementCompanyMember,
  TManagementCompanySubscription,
} from '@packages/domain'
import type {
  UsersRepository,
  ManagementCompaniesRepository,
  ManagementCompanyMembersRepository,
  ManagementCompanySubscriptionsRepository,
} from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import { type TServiceResult, success, failure } from '../base.service'

export interface ICreateCompanyWithExistingAdminInput {
  company: Omit<TManagementCompanyCreate, 'createdBy' | 'isActive'>
  existingUserId: string
  createdBy: string // Superadmin user ID
}

export interface ICreateCompanyWithExistingAdminResult {
  company: TManagementCompany
  admin: TUser
  member: TManagementCompanyMember
  subscription: TManagementCompanySubscription
}

/**
 * Service for creating a management company with an existing user as admin.
 *
 * Unlike CreateCompanyWithAdminService (which creates a new user + invitation flow),
 * this service handles the case where the admin user already exists in the system.
 *
 * Flow:
 * 1. Validates the existing user is active
 * 2. Creates the management company (isActive=true, since admin is already confirmed)
 * 3. Creates the member with primary admin role and full permissions
 * 4. Creates a trial subscription (30 days)
 */
export class CreateCompanyWithExistingAdminService {
  constructor(
    private readonly db: TDrizzleClient,
    private readonly usersRepository: UsersRepository,
    private readonly managementCompaniesRepository: ManagementCompaniesRepository,
    private readonly membersRepository: ManagementCompanyMembersRepository,
    private readonly subscriptionsRepository: ManagementCompanySubscriptionsRepository
  ) {}

  async execute(
    input: ICreateCompanyWithExistingAdminInput
  ): Promise<TServiceResult<ICreateCompanyWithExistingAdminResult>> {
    // Validate user exists and is active
    const user = await this.usersRepository.getById(input.existingUserId)

    if (!user) {
      return failure('User not found', 'NOT_FOUND')
    }

    if (!user.isActive) {
      return failure('User is not active', 'BAD_REQUEST')
    }

    // All writes inside a transaction for atomicity
    return await this.db.transaction(async (tx) => {
      const txCompaniesRepo = this.managementCompaniesRepository.withTx(tx)
      const txMembersRepo = this.membersRepository.withTx(tx)
      const txSubscriptionsRepo = this.subscriptionsRepository.withTx(tx)

      // Create management company (active from the start since admin already exists)
      const companyData: TManagementCompanyCreate = {
        ...input.company,
        createdBy: input.createdBy,
        isActive: true,
      }

      const company = await txCompaniesRepo.create(companyData)

      if (!company) {
        return failure('Failed to create management company', 'INTERNAL_ERROR')
      }

      // Create member with primary admin role
      const member = await txMembersRepo.create({
        managementCompanyId: company.id,
        userId: user.id,
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
        invitedBy: input.createdBy,
        isActive: true,
        deactivatedAt: null,
        deactivatedBy: null,
      })

      if (!member) {
        return failure('Failed to create member', 'INTERNAL_ERROR')
      }

      // Create trial subscription (30 days)
      const trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + 30)

      const subscription = await txSubscriptionsRepo.create({
        managementCompanyId: company.id,
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
        nextBillingDate: trialEndsAt,
        trialEndsAt,
        autoRenew: false,
        notes: 'Automatically created trial subscription',
        createdBy: input.createdBy,
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
      })

      if (!subscription) {
        return failure('Failed to create trial subscription', 'INTERNAL_ERROR')
      }

      return success({
        company,
        admin: user,
        member,
        subscription,
      })
    })
  }
}
